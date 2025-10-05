#!/usr/bin/env npx tsx
/**
 * Direct telemetry test with hardcoded credentials
 */

import { createClient } from '@supabase/supabase-js';

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

async function testDirect() {
  console.log('🧪 Direct Telemetry Test\n');

  const supabase = createClient(TELEMETRY_BACKEND.URL!, TELEMETRY_BACKEND.ANON_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const testEvent = {
    user_id: 'direct-test-' + Date.now(),
    event: 'direct_test',
    properties: {
      source: 'test-telemetry-direct.ts',
      timestamp: new Date().toISOString()
    }
  };

  console.log('Sending event:', testEvent);

  const { data, error } = await supabase
    .from('telemetry_events')
    .insert([testEvent]);

  if (error) {
    console.error('❌ Failed:', error);
  } else {
    console.log('✅ Success! Event sent directly to Supabase');
    console.log('Response:', data);
  }
}

testDirect().catch(console.error);
