#!/usr/bin/env npx tsx
/**
 * List Telemetry Events Script
 *
 * This script demonstrates how to query telemetry events from Supabase.
 * IMPORTANT: By design, anonymous users cannot read telemetry data due to RLS policies.
 * This script shows the security restrictions and provides templates for admin access.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Telemetry backend configuration - requires explicit environment variables
const TELEMETRY_BACKEND = {
  URL: process.env.SUPABASE_URL || process.env.TELEMETRY_BACKEND_URL,
  ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.TELEMETRY_BACKEND_ANON_KEY,
  SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// Validate configuration
if (!TELEMETRY_BACKEND.URL || !TELEMETRY_BACKEND.ANON_KEY) {
  console.error('❌ Telemetry configuration required. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  console.error('   For admin operations, also set SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

interface TelemetryEvent {
  user_id: string;
  event: string;
  properties: Record<string, any>;
  created_at?: string;
}

interface TelemetryWorkflow {
  user_id: string;
  workflow_hash: string;
  node_count: number;
  node_types: string[];
  has_trigger: boolean;
  has_webhook: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  sanitized_workflow: any;
  created_at?: string;
}

class TelemetryLister {
  private supabase: SupabaseClient;

  constructor(useAnonKey: boolean = true) {
    const key = useAnonKey ? TELEMETRY_BACKEND.ANON_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!key && !useAnonKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable required for admin access');
    }

    this.supabase = createClient(TELEMETRY_BACKEND.URL!, key!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }

  /**
   * Test anonymous access restrictions
   */
  async testAnonymousAccess(): Promise<void> {
    console.log('🔒 Testing Anonymous Access Restrictions\n');

    try {
      // Try to select events (should fail)
      console.log('Testing SELECT events...');
      const { data: events, error: selectError } = await this.supabase
        .from('telemetry_events')
        .select('*')
        .limit(1);

      if (selectError) {
        console.log('✅ SELECT blocked by RLS:', selectError.message);
      } else {
        console.log('⚠️  Unexpected: SELECT succeeded (data may be empty due to RLS)');
        console.log('Result:', events);
      }

      // Try to select workflows (should fail)
      console.log('\nTesting SELECT workflows...');
      const { data: workflows, error: workflowError } = await this.supabase
        .from('telemetry_workflows')
        .select('*')
        .limit(1);

      if (workflowError) {
        console.log('✅ SELECT workflows blocked by RLS:', workflowError.message);
      } else {
        console.log('⚠️  Unexpected: SELECT workflows succeeded');
        console.log('Result:', workflows);
      }

    } catch (error) {
      console.error('❌ Error testing access:', error);
    }
  }

  /**
   * List telemetry events (requires admin/service role access)
   */
  async listEvents(options: {
    limit?: number;
    userId?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<void> {
    const { limit = 50, userId, eventType, startDate, endDate } = options;

    console.log('📊 Listing Telemetry Events\n');
    console.log('Options:', { limit, userId, eventType, startDate, endDate });

    try {
      let query = this.supabase
        .from('telemetry_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (eventType) {
        query = query.eq('event', eventType);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to list events:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.log('📭 No events found');
        return;
      }

      console.log(`✅ Found ${data.length} events:\n`);

      data.forEach((event: TelemetryEvent, index: number) => {
        console.log(`${index + 1}. Event: ${event.event}`);
        console.log(`   User ID: ${event.user_id}`);
        console.log(`   Timestamp: ${event.created_at}`);
        console.log(`   Properties:`, JSON.stringify(event.properties, null, 2));
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error listing events:', error);
    }
  }

  /**
   * List telemetry workflows (requires admin/service role access)
   */
  async listWorkflows(options: {
    limit?: number;
    userId?: string;
    hasTrigger?: boolean;
    complexity?: string;
  } = {}): Promise<void> {
    const { limit = 20, userId, hasTrigger, complexity } = options;

    console.log('🔄 Listing Telemetry Workflows\n');
    console.log('Options:', { limit, userId, hasTrigger, complexity });

    try {
      let query = this.supabase
        .from('telemetry_workflows')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (hasTrigger !== undefined) {
        query = query.eq('has_trigger', hasTrigger);
      }

      if (complexity) {
        query = query.eq('complexity', complexity);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Failed to list workflows:', error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.log('📭 No workflows found');
        return;
      }

      console.log(`✅ Found ${data.length} workflows:\n`);

      data.forEach((workflow: TelemetryWorkflow, index: number) => {
        console.log(`${index + 1}. Workflow Hash: ${workflow.workflow_hash}`);
        console.log(`   User ID: ${workflow.user_id}`);
        console.log(`   Node Count: ${workflow.node_count}`);
        console.log(`   Node Types: ${workflow.node_types.join(', ')}`);
        console.log(`   Has Trigger: ${workflow.has_trigger}`);
        console.log(`   Has Webhook: ${workflow.has_webhook}`);
        console.log(`   Complexity: ${workflow.complexity}`);
        console.log(`   Timestamp: ${workflow.created_at}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error listing workflows:', error);
    }
  }

  /**
   * Get telemetry statistics
   */
  async getStats(): Promise<void> {
    console.log('📈 Telemetry Statistics\n');

    try {
      // Count events
      const { count: eventCount, error: eventError } = await this.supabase
        .from('telemetry_events')
        .select('*', { count: 'exact', head: true });

      if (eventError) {
        console.error('❌ Failed to count events:', eventError.message);
      } else {
        console.log(`📊 Total Events: ${eventCount}`);
      }

      // Count workflows
      const { count: workflowCount, error: workflowError } = await this.supabase
        .from('telemetry_workflows')
        .select('*', { count: 'exact', head: true });

      if (workflowError) {
        console.error('❌ Failed to count workflows:', workflowError.message);
      } else {
        console.log(`🔄 Total Workflows: ${workflowCount}`);
      }

      // Get event types distribution
      const { data: eventTypes, error: typesError } = await this.supabase
        .from('telemetry_events')
        .select('event')
        .limit(1000);

      if (!typesError && eventTypes) {
        const distribution = eventTypes.reduce((acc, item) => {
          acc[item.event] = (acc[item.event] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log('\n📋 Event Types Distribution:');
        Object.entries(distribution)
          .sort(([,a], [,b]) => b - a)
          .forEach(([event, count]) => {
            console.log(`   ${event}: ${count}`);
          });
      }

    } catch (error) {
      console.error('❌ Error getting stats:', error);
    }
  }
}

/**
 * Main function with command line argument parsing
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🚀 Telemetry Events Lister\n');

  // Parse command line arguments
  const options: any = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value || true;
    }
  }

  // Determine access level
  const useAdmin = options.admin || process.env.USE_ADMIN_ACCESS === 'true';

  if (useAdmin) {
    console.log('🔑 Using ADMIN/SERVICE ROLE access');
  } else {
    console.log('👤 Using ANONYMOUS access (read-only restrictions apply)');
  }

  const lister = new TelemetryLister(!useAdmin);

  try {
    switch (command) {
      case 'test':
        await lister.testAnonymousAccess();
        break;

      case 'events':
        await lister.listEvents({
          limit: parseInt(options.limit) || 50,
          userId: options.userId,
          eventType: options.eventType,
          startDate: options.startDate,
          endDate: options.endDate
        });
        break;

      case 'workflows':
        await lister.listWorkflows({
          limit: parseInt(options.limit) || 20,
          userId: options.userId,
          hasTrigger: options.hasTrigger === 'true' ? true : options.hasTrigger === 'false' ? false : undefined,
          complexity: options.complexity
        });
        break;

      case 'stats':
        await lister.getStats();
        break;

      default:
        console.log('Usage:');
        console.log('  npx tsx list-telemetry-events.ts test                    # Test access restrictions');
        console.log('  npx tsx list-telemetry-events.ts events                 # List recent events');
        console.log('  npx tsx list-telemetry-events.ts workflows              # List recent workflows');
        console.log('  npx tsx list-telemetry-events.ts stats                  # Show statistics');
        console.log('');
        console.log('Options:');
        console.log('  --admin                Use service role key (requires SUPABASE_SERVICE_ROLE_KEY env var)');
        console.log('  --limit=N             Limit results (default: 50 for events, 20 for workflows)');
        console.log('  --userId=ID           Filter by user ID');
        console.log('  --eventType=TYPE      Filter events by type');
        console.log('  --startDate=ISO       Filter by start date (ISO format)');
        console.log('  --endDate=ISO         Filter by end date (ISO format)');
        console.log('  --hasTrigger=true     Filter workflows by trigger presence');
        console.log('  --complexity=LEVEL    Filter workflows by complexity (simple/medium/complex)');
        console.log('');
        console.log('Examples:');
        console.log('  npx tsx list-telemetry-events.ts events --limit=10');
        console.log('  npx tsx list-telemetry-events.ts workflows --userId=abc123 --hasTrigger=true');
        console.log('  npx tsx list-telemetry-events.ts events --eventType=tool_usage --startDate=2024-01-01T00:00:00Z');
        console.log('  SUPABASE_SERVICE_ROLE_KEY=your_key npx tsx list-telemetry-events.ts stats --admin');
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { TelemetryLister };
