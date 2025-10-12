/**
 * Telemetry Types and Interfaces
 * Centralized type definitions for the telemetry system
 */

import { StartupCheckpoint } from './startup-checkpoints';

export interface TelemetryEvent {
  user_id: string;
  event: string;
  properties: Record<string, any>;
  created_at?: string;
}

/**
 * Startup error event - captures pre-handshake failures
 */
export interface StartupErrorEvent extends TelemetryEvent {
  event: 'startup_error';
  properties: {
    checkpoint: StartupCheckpoint;
    errorMessage: string;
    errorType: string;
    checkpointsPassed: StartupCheckpoint[];
    checkpointsPassedCount: number;
    startupDuration: number;
    platform: string;
    arch: string;
    nodeVersion: string;
    isDocker: boolean;
  };
}

/**
 * Startup completed event - confirms server is functional
 */
export interface StartupCompletedEvent extends TelemetryEvent {
  event: 'startup_completed';
  properties: {
    version: string;
  };
}

/**
 * Enhanced session start properties with startup tracking
 */
export interface SessionStartProperties {
  version: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  isDocker: boolean;
  cloudPlatform: string | null;
  // NEW: Startup tracking fields (v2.18.2)
  startupDurationMs?: number;
  checkpointsPassed?: StartupCheckpoint[];
  startupErrorCount?: number;
}

export interface WorkflowTelemetry {
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

export interface SanitizedWorkflow {
  nodes: any[];
  connections: any;
  nodeCount: number;
  nodeTypes: string[];
  hasTrigger: boolean;
  hasWebhook: boolean;
  complexity: 'simple' | 'medium' | 'complex';
  workflowHash: string;
}

export const TELEMETRY_CONFIG = {
  // Batch processing
  BATCH_FLUSH_INTERVAL: 5000, // 5 seconds
  EVENT_QUEUE_THRESHOLD: 10, // Batch events for efficiency
  WORKFLOW_QUEUE_THRESHOLD: 5, // Batch workflows

  // Retry logic
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second base delay
  OPERATION_TIMEOUT: 5000, // 5 seconds

  // Rate limiting
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_EVENTS: 100, // Max events per window

  // Queue limits
  MAX_QUEUE_SIZE: 1000, // Maximum events to queue
  MAX_BATCH_SIZE: 50, // Maximum events per batch
} as const;

// Load environment variables for telemetry configuration
// No hardcoded fallbacks - telemetry must be explicitly configured
const TELEMETRY_URL = process.env.SUPABASE_URL || process.env.TELEMETRY_BACKEND_URL;
const TELEMETRY_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.TELEMETRY_BACKEND_ANON_KEY;

export const TELEMETRY_BACKEND = TELEMETRY_URL && TELEMETRY_ANON_KEY ? {
  URL: TELEMETRY_URL,
  ANON_KEY: TELEMETRY_ANON_KEY
} : null;

export interface TelemetryMetrics {
  eventsTracked: number;
  eventsDropped: number;
  eventsFailed: number;
  batchesSent: number;
  batchesFailed: number;
  averageFlushTime: number;
  lastFlushTime?: number;
  rateLimitHits: number;
}

export enum TelemetryErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  QUEUE_OVERFLOW_ERROR = 'QUEUE_OVERFLOW_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface TelemetryErrorContext {
  type: TelemetryErrorType;
  message: string;
  context?: Record<string, any>;
  timestamp: number;
  retryable: boolean;
}
