#!/usr/bin/env npx tsx
/**
 * Test direct workflow insert to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

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

async function testWorkflowInsert() {
  const supabase = createClient(TELEMETRY_BACKEND.URL!, TELEMETRY_BACKEND.ANON_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  // Generate a proper 64-character SHA-256 hash for the workflow
  const workflowData = JSON.stringify({
    nodes: [
      { id: '1', type: 'webhook', parameters: {} },
      { id: '2', type: 'http', parameters: {} }
    ],
    connections: {}
  });
  const workflowHash = createHash('sha256').update(workflowData).digest('hex');

  const testWorkflow = {
    user_id: 'direct-test-' + Date.now(),
    workflow_hash: workflowHash,
    node_count: 2,
    node_types: ['webhook', 'http'],
    has_trigger: true,
    has_webhook: true,
    complexity: 'simple' as const,
    sanitized_workflow: {
      nodes: [
        { id: '1', type: 'webhook', parameters: {} },
        { id: '2', type: 'http', parameters: {} }
      ],
      connections: {}
    }
  };

  console.log('Attempting direct insert to telemetry_workflows...');
  console.log('Data:', JSON.stringify(testWorkflow, null, 2));

  const { data, error } = await supabase
    .from('telemetry_workflows')
    .insert([testWorkflow]);

  if (error) {
    console.error('\n❌ Error:', error);
  } else {
    console.log('\n✅ Success! Workflow inserted');
    if (data) {
      console.log('Response:', data);
    }
  }
}

testWorkflowInsert().catch(console.error);
