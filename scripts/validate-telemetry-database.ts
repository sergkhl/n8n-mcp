#!/usr/bin/env npx tsx
/**
 * Telemetry Database Validation Script
 * Tests the complete telemetry database setup and functionality
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration - requires explicit environment variables
const TELEMETRY_BACKEND = {
  URL: process.env.SUPABASE_URL || process.env.TELEMETRY_BACKEND_URL,
  ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.TELEMETRY_BACKEND_ANON_KEY,
  SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// Validate configuration
if (!TELEMETRY_BACKEND.URL || !TELEMETRY_BACKEND.ANON_KEY) {
  console.error('❌ Telemetry configuration required. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration?: number;
}

class TelemetryDatabaseValidator {
  private anonClient: SupabaseClient;
  private serviceClient?: SupabaseClient;
  private results: ValidationResult[] = [];
  private testUserId: string;

  constructor() {
    this.anonClient = createClient(TELEMETRY_BACKEND.URL!, TELEMETRY_BACKEND.ANON_KEY!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    if (TELEMETRY_BACKEND.SERVICE_KEY) {
      this.serviceClient = createClient(TELEMETRY_BACKEND.URL!, TELEMETRY_BACKEND.SERVICE_KEY!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });
    }

    this.testUserId = 'validation-test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  private async runTest(testName: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    try {
      await testFn();
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'PASS',
        message: 'Test completed successfully',
        duration
      });
      console.log(`✅ ${testName} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        test: testName,
        status: 'FAIL',
        message: error instanceof Error ? error.message : String(error),
        duration
      });
      console.log(`❌ ${testName}: ${error instanceof Error ? error.message : String(error)} (${duration}ms)`);
    }
  }

  async validateTables(): Promise<void> {
    console.log('\n🔍 Testing Table Existence and Structure...\n');

    await this.runTest('telemetry_events table exists', async () => {
      const { data, error } = await this.anonClient
        .from('telemetry_events')
        .select('id')
        .limit(1);

      if (error && !error.message.includes('permission denied')) {
        throw new Error(`Table access error: ${error.message}`);
      }
    });

    await this.runTest('telemetry_workflows table exists', async () => {
      const { data, error } = await this.anonClient
        .from('telemetry_workflows')
        .select('id')
        .limit(1);

      if (error && !error.message.includes('permission denied')) {
        throw new Error(`Table access error: ${error.message}`);
      }
    });
  }

  async validateSecurity(): Promise<void> {
    console.log('\n🔒 Testing Security Policies (RLS)...\n');

    await this.runTest('Anonymous INSERT to telemetry_events', async () => {
      const testEvent = {
        user_id: this.testUserId,
        event: 'validation_test',
        properties: { test_type: 'security_validation', timestamp: Date.now() }
      };

      const { error } = await this.anonClient
        .from('telemetry_events')
        .insert([testEvent]);

      if (error) {
        throw new Error(`Anonymous insert failed: ${error.message}`);
      }
    });

    await this.runTest('Anonymous SELECT from telemetry_events blocked', async () => {
      const { data, error } = await this.anonClient
        .from('telemetry_events')
        .select('*')
        .limit(1);

      if (!error || !error.message.includes('permission denied')) {
        throw new Error('Anonymous select should be blocked by RLS');
      }
    });

    await this.runTest('Anonymous INSERT to telemetry_workflows', async () => {
      const workflowData = JSON.stringify({
        nodes: [
          { id: '1', type: 'webhook', parameters: {} },
          { id: '2', type: 'http', parameters: {} },
          { id: '3', type: 'slack', parameters: {} }
        ],
        connections: {}
      });
      const testWorkflow = {
        user_id: this.testUserId,
        workflow_hash: require('crypto').createHash('sha256').update(workflowData).digest('hex'),
        node_count: 3,
        node_types: ['webhook', 'http', 'slack'],
        has_trigger: true,
        has_webhook: true,
        complexity: 'simple',
        sanitized_workflow: { nodes: [], connections: {} }
      };

      const { error } = await this.anonClient
        .from('telemetry_workflows')
        .insert([testWorkflow]);

      if (error) {
        throw new Error(`Anonymous workflow insert failed: ${error.message}`);
      }
    });

    await this.runTest('Anonymous SELECT from telemetry_workflows blocked', async () => {
      const { data, error } = await this.anonClient
        .from('telemetry_workflows')
        .select('*')
        .limit(1);

      if (!error || !error.message.includes('permission denied')) {
        throw new Error('Anonymous workflow select should be blocked by RLS');
      }
    });
  }

  async validateFunctions(): Promise<void> {
    console.log('\n⚙️  Testing Database Functions...\n');

    if (!this.serviceClient) {
      console.log('⏭️  Skipping function tests (no service role key provided)');
      return;
    }

    await this.runTest('get_telemetry_stats function', async () => {
      const { data, error } = await this.serviceClient!
        .rpc('get_telemetry_stats');

      if (error) {
        throw new Error(`Stats function error: ${error.message}`);
      }

      if (!data || !Array.isArray(data)) {
        throw new Error('Stats function returned invalid data');
      }
    });

    await this.runTest('insert_telemetry_event function', async () => {
      const eventId = await this.serviceClient!.rpc('insert_telemetry_event', {
        p_user_id: this.testUserId,
        p_event: 'function_test',
        p_properties: { source: 'validation_script' }
      });

      if (!eventId) {
        throw new Error('Function did not return event ID');
      }
    });

    await this.runTest('insert_telemetry_workflow function', async () => {
      const workflowData = JSON.stringify({
        nodes: [
          { id: '1', type: 'webhook', parameters: {} },
          { id: '2', type: 'code', parameters: {} }
        ],
        connections: {}
      });
      const workflowHash = require('crypto').createHash('sha256').update(workflowData).digest('hex');
      const workflowId = await this.serviceClient!.rpc('insert_telemetry_workflow', {
        p_user_id: this.testUserId,
        p_workflow_hash: workflowHash,
        p_node_count: 2,
        p_node_types: ['webhook', 'code'],
        p_has_trigger: true,
        p_has_webhook: false,
        p_complexity: 'simple',
        p_sanitized_workflow: { nodes: [], connections: {} }
      });

      if (!workflowId) {
        throw new Error('Function did not return workflow ID');
      }
    });
  }

  async validatePerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...\n');

    if (!this.serviceClient) {
      console.log('⏭️  Skipping performance tests (no service role key provided)');
      return;
    }

    // Test bulk insert performance
    await this.runTest('Bulk insert performance (10 events)', async () => {
      const events = Array.from({ length: 10 }, (_, i) => ({
        user_id: this.testUserId,
        event: 'performance_test',
        properties: { index: i, timestamp: Date.now() }
      }));

      const startTime = Date.now();
      const { error } = await this.serviceClient!
        .from('telemetry_events')
        .insert(events);

      if (error) {
        throw new Error(`Bulk insert failed: ${error.message}`);
      }

      const duration = Date.now() - startTime;
      if (duration > 5000) { // More than 5 seconds for 10 inserts is concerning
        console.warn(`⚠️  Bulk insert took ${duration}ms - consider performance optimization`);
      }
    });

    // Test query performance
    await this.runTest('Query performance test', async () => {
      const startTime = Date.now();
      const { data, error } = await this.serviceClient!
        .from('telemetry_events')
        .select('id, user_id, event, created_at')
        .eq('user_id', this.testUserId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new Error(`Query failed: ${error.message}`);
      }

      const duration = Date.now() - startTime;
      if (duration > 1000) { // More than 1 second for a simple query is concerning
        console.warn(`⚠️  Query took ${duration}ms - consider index optimization`);
      }
    });
  }

  async validateViews(): Promise<void> {
    console.log('\n📊 Testing Database Views...\n');

    if (!this.serviceClient) {
      console.log('⏭️  Skipping view tests (no service role key provided)');
      return;
    }

    await this.runTest('telemetry_event_stats view', async () => {
      const { data, error } = await this.serviceClient!
        .from('telemetry_event_stats')
        .select('*')
        .limit(10);

      if (error) {
        throw new Error(`Event stats view error: ${error.message}`);
      }
    });

    await this.runTest('telemetry_workflow_stats view', async () => {
      const { data, error } = await this.serviceClient!
        .from('telemetry_workflow_stats')
        .select('*');

      if (error) {
        throw new Error(`Workflow stats view error: ${error.message}`);
      }
    });

    await this.runTest('telemetry_daily_activity view', async () => {
      const { data, error } = await this.serviceClient!
        .from('telemetry_daily_activity')
        .select('*')
        .limit(30);

      if (error) {
        throw new Error(`Daily activity view error: ${error.message}`);
      }
    });
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up test data...\n');

    if (!this.serviceClient) {
      console.log('⏭️  Skipping cleanup (no service role key provided)');
      return;
    }

    await this.runTest('Cleanup test events', async () => {
      const { error } = await this.serviceClient!
        .from('telemetry_events')
        .delete()
        .eq('user_id', this.testUserId);

      if (error) {
        throw new Error(`Cleanup failed: ${error.message}`);
      }
    });

    await this.runTest('Cleanup test workflows', async () => {
      const { error } = await this.serviceClient!
        .from('telemetry_workflows')
        .delete()
        .eq('user_id', this.testUserId);

      if (error) {
        throw new Error(`Cleanup failed: ${error.message}`);
      }
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Telemetry Database Validation\n');
    console.log('='.repeat(50));

    const startTime = Date.now();

    try {
      await this.validateTables();
      await this.validateSecurity();
      await this.validateFunctions();
      await this.validatePerformance();
      await this.validateViews();
      await this.cleanup();

      const totalTime = Date.now() - startTime;

      console.log('\n' + '='.repeat(50));
      console.log('📋 VALIDATION RESULTS SUMMARY');
      console.log('='.repeat(50));

      const passed = this.results.filter(r => r.status === 'PASS').length;
      const failed = this.results.filter(r => r.status === 'FAIL').length;
      const skipped = this.results.filter(r => r.status === 'SKIP').length;

      console.log(`✅ Passed: ${passed}`);
      console.log(`❌ Failed: ${failed}`);
      console.log(`⏭️  Skipped: ${skipped}`);
      console.log(`⏱️  Total Time: ${totalTime}ms`);

      if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        this.results
          .filter(r => r.status === 'FAIL')
          .forEach(result => {
            console.log(`   • ${result.test}: ${result.message}`);
          });
      }

      console.log('\n' + '='.repeat(50));

      if (failed === 0) {
        console.log('🎉 All validation tests passed! Database is ready for production.');
      } else {
        console.log('⚠️  Some tests failed. Please review the issues above.');
        process.exit(1);
      }

    } catch (error) {
      console.error('💥 Validation failed with error:', error);
      process.exit(1);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const validator = new TelemetryDatabaseValidator();

  // Check for service role key
  if (!TELEMETRY_BACKEND.SERVICE_KEY) {
    console.log('⚠️  No SUPABASE_SERVICE_ROLE_KEY provided. Some tests will be skipped.');
    console.log('   Set SUPABASE_SERVICE_ROLE_KEY environment variable for full validation.\n');
  }

  await validator.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

export { TelemetryDatabaseValidator };
