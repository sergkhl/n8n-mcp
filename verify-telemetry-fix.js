#!/usr/bin/env node

/**
 * Verification script to test that telemetry permissions are fixed
 * Run this AFTER applying the GRANT permissions fix
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

// Telemetry backend configuration - requires explicit environment variables
const TELEMETRY_BACKEND = {
  URL: process.env.SUPABASE_URL || process.env.TELEMETRY_BACKEND_URL,
  ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.TELEMETRY_BACKEND_ANON_KEY
};

// Validate configuration
if (!TELEMETRY_BACKEND.URL || !TELEMETRY_BACKEND.ANON_KEY) {
  console.error('❌ Telemetry configuration required. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

async function verifyTelemetryFix() {
  console.log('🔍 VERIFYING TELEMETRY PERMISSIONS FIX');
  console.log('====================================\n');

  const supabase = createClient(TELEMETRY_BACKEND.URL, TELEMETRY_BACKEND.ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const testUserId = 'verify-' + crypto.randomBytes(4).toString('hex');

  // Test 1: Event insert
  console.log('📝 Test 1: Event insert');
  try {
    const { data, error } = await supabase
      .from('telemetry_events')
      .insert([{
        user_id: testUserId,
        event: 'verification_test',
        properties: { fixed: true }
      }]);

    if (error) {
      console.error('❌ Event insert failed:', error.message);
      return false;
    } else {
      console.log('✅ Event insert successful');
    }
  } catch (e) {
    console.error('❌ Event insert exception:', e.message);
    return false;
  }

  // Test 2: Workflow insert
  console.log('📝 Test 2: Workflow insert');
  try {
    const { data, error } = await supabase
      .from('telemetry_workflows')
      .insert([{
        user_id: testUserId,
        workflow_hash: crypto.createHash('sha256').update(JSON.stringify({
          nodes: [
            { id: '1', type: 'n8n-nodes-base.webhook', parameters: {} },
            { id: '2', type: 'n8n-nodes-base.set', parameters: {} }
          ],
          connections: {}
        })).digest('hex'),
        node_count: 2,
        node_types: ['n8n-nodes-base.webhook', 'n8n-nodes-base.set'],
        has_trigger: true,
        has_webhook: true,
        complexity: 'simple',
        sanitized_workflow: {
          nodes: [{
            id: 'test-node',
            type: 'n8n-nodes-base.webhook',
            position: [100, 100],
            parameters: {}
          }],
          connections: {}
        }
      }]);

    if (error) {
      console.error('❌ Workflow insert failed:', error.message);
      return false;
    } else {
      console.log('✅ Workflow insert successful');
    }
  } catch (e) {
    console.error('❌ Workflow insert exception:', e.message);
    return false;
  }

  // Test 3: Upsert operation (like real telemetry)
  console.log('📝 Test 3: Upsert operation');
  try {
    // Generate a proper 64-character SHA-256 hash
    const workflowData = JSON.stringify({
      nodes: [
        { id: '1', type: 'n8n-nodes-base.webhook', parameters: {} },
        { id: '2', type: 'n8n-nodes-base.set', parameters: {} },
        { id: '3', type: 'n8n-nodes-base.if', parameters: {} }
      ],
      connections: {}
    });
    const workflowHash = crypto.createHash('sha256').update(workflowData).digest('hex');

    const { data, error } = await supabase
      .from('telemetry_workflows')
      .upsert([{
        user_id: testUserId,
        workflow_hash: workflowHash,
        node_count: 3,
        node_types: ['n8n-nodes-base.webhook', 'n8n-nodes-base.set', 'n8n-nodes-base.if'],
        has_trigger: true,
        has_webhook: true,
        complexity: 'medium',
        sanitized_workflow: {
          nodes: [],
          connections: {}
        }
      }], {
        onConflict: 'workflow_hash',
        ignoreDuplicates: true,
      });

    if (error) {
      console.error('❌ Upsert failed:', error.message);
      return false;
    } else {
      console.log('✅ Upsert successful');
    }
  } catch (e) {
    console.error('❌ Upsert exception:', e.message);
    return false;
  }

  console.log('\n🎉 All tests passed! Telemetry permissions are fixed.');
  console.log('👍 Workflow telemetry should now work in the actual application.');

  return true;
}

async function main() {
  const success = await verifyTelemetryFix();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);
