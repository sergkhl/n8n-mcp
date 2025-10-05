-- ============================================
-- n8n-mcp Telemetry Database Setup
-- ============================================
-- This script creates the complete telemetry database for n8n-mcp
-- anonymous usage statistics collection.
--
-- SECURITY PRINCIPLES:
-- - Anonymous users can INSERT data (for telemetry collection)
-- - Anonymous users CANNOT SELECT/UPDATE/DELETE data (RLS protection)
-- - Only service role can perform administrative operations
-- - All data is anonymized and privacy-focused
--
-- PERFORMANCE CONSIDERATIONS:
-- - Partitioning by month for large tables
-- - Appropriate indexes for common queries
-- - JSONB for flexible property storage
-- - Efficient retention policies

-- ============================================
-- 1. EXTENSIONS
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Note: pg_cron extension is optional and may not be available in all PostgreSQL installations
-- If not available, automated cleanup will need to be scheduled externally
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "pg_cron";
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'pg_cron extension not available (insufficient privileges)';
        WHEN undefined_file THEN
            RAISE NOTICE 'pg_cron extension not available (not installed)';
    END;
END;
$$;

-- ============================================
-- 2. TABLES
-- ============================================

-- Telemetry Events Table
-- Stores individual telemetry events (tool usage, errors, sessions, etc.)
CREATE TABLE IF NOT EXISTS telemetry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(64) NOT NULL,  -- Anonymous hashed user ID (16-64 chars)
    event VARCHAR(100) NOT NULL,   -- Event type (tool_usage, session_start, error, etc.)
    properties JSONB NOT NULL,     -- Flexible properties object
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT telemetry_events_user_id_length CHECK (length(user_id) >= 16),
    CONSTRAINT telemetry_events_event_length CHECK (length(event) >= 1 AND length(event) <= 100),
    CONSTRAINT telemetry_events_properties_not_empty CHECK (jsonb_typeof(properties) = 'object')
);

-- Telemetry Workflows Table
-- Stores sanitized workflow structures and metadata
CREATE TABLE IF NOT EXISTS telemetry_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(64) NOT NULL,              -- Anonymous hashed user ID
    workflow_hash VARCHAR(64) NOT NULL,        -- SHA-256 hash of sanitized workflow
    node_count INTEGER NOT NULL,               -- Number of nodes in workflow
    node_types TEXT[] NOT NULL,                -- Array of node types used
    has_trigger BOOLEAN NOT NULL DEFAULT false,-- Whether workflow has triggers
    has_webhook BOOLEAN NOT NULL DEFAULT false,-- Whether workflow has webhooks
    complexity VARCHAR(20) NOT NULL,           -- simple/medium/complex
    sanitized_workflow JSONB NOT NULL,         -- Sanitized workflow structure
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT telemetry_workflows_user_id_length CHECK (length(user_id) >= 16),
    CONSTRAINT telemetry_workflows_workflow_hash_length CHECK (length(workflow_hash) = 64),
    CONSTRAINT telemetry_workflows_node_count_positive CHECK (node_count > 0),
    CONSTRAINT telemetry_workflows_node_types_not_empty CHECK (array_length(node_types, 1) > 0),
    CONSTRAINT telemetry_workflows_complexity_enum CHECK (complexity IN ('simple', 'medium', 'complex')),
    CONSTRAINT telemetry_workflows_sanitized_workflow_not_empty CHECK (jsonb_typeof(sanitized_workflow) = 'object'),
    CONSTRAINT telemetry_workflows_unique_hash_user UNIQUE (workflow_hash, user_id)
);

-- Telemetry Audit Log
-- Tracks administrative operations for compliance
CREATE TABLE IF NOT EXISTS telemetry_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation VARCHAR(50) NOT NULL,      -- INSERT, SELECT, DELETE, etc.
    table_name VARCHAR(50) NOT NULL,     -- telemetry_events, telemetry_workflows
    record_count INTEGER,                -- Number of records affected
    user_role VARCHAR(50),               -- anon, service_role, etc.
    ip_address INET,                     -- Client IP (if available)
    metadata JSONB,                      -- Additional context
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. INDEXES
-- ============================================

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON telemetry_events (user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event ON telemetry_events (event);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON telemetry_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_event ON telemetry_events (user_id, event);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_user ON telemetry_events (created_at DESC, user_id);

-- JSONB indexes for common property queries
CREATE INDEX IF NOT EXISTS idx_telemetry_events_properties_gin ON telemetry_events USING GIN (properties);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_tool_name ON telemetry_events ((properties->>'tool_name')) WHERE properties ? 'tool_name';
CREATE INDEX IF NOT EXISTS idx_telemetry_events_error_type ON telemetry_events ((properties->>'error_type')) WHERE properties ? 'error_type';

-- Workflows table indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_user_id ON telemetry_workflows (user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_hash ON telemetry_workflows (workflow_hash);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_created_at ON telemetry_workflows (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_complexity ON telemetry_workflows (complexity);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_has_trigger ON telemetry_workflows (has_trigger);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_node_count ON telemetry_workflows (node_count);
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_user_created ON telemetry_workflows (user_id, created_at DESC);

-- JSONB indexes for workflow properties
CREATE INDEX IF NOT EXISTS idx_telemetry_workflows_sanitized_gin ON telemetry_workflows USING GIN (sanitized_workflow);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_audit_created ON telemetry_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_audit_operation ON telemetry_audit_log (operation);

-- ============================================
-- 4. PARTITIONING (for large datasets)
-- ============================================

-- Create partitioning function for monthly partitions
CREATE OR REPLACE FUNCTION create_telemetry_partition(
    table_name TEXT,
    start_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    end_date DATE;
BEGIN
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');

    -- Create partition for events table
    IF table_name = 'telemetry_events' THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, table_name, start_date, end_date
        );
    END IF;

    -- Create partition for workflows table
    IF table_name = 'telemetry_workflows' THEN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, table_name, start_date, end_date
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: To convert tables to partitioned tables after initial setup, run these commands manually:
-- DO $$
-- BEGIN
--     -- Check if default partitions exist before detaching
--     IF EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = 'telemetry_events_default'::regclass) THEN
--         ALTER TABLE telemetry_events DETACH PARTITION telemetry_events_default;
--     END IF;
--     IF EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = 'telemetry_workflows_default'::regclass) THEN
--         ALTER TABLE telemetry_workflows DETACH PARTITION telemetry_workflows_default;
--     END IF;
-- END;
-- $$;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Anonymous users can INSERT into events
CREATE POLICY "anon_insert_telemetry_events" ON telemetry_events
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy: Anonymous users can INSERT into workflows
CREATE POLICY "anon_insert_telemetry_workflows" ON telemetry_workflows
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Policy: Service role can do everything (admin operations)
CREATE POLICY "service_role_all_telemetry_events" ON telemetry_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_all_telemetry_workflows" ON telemetry_workflows
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Service role can manage audit log
CREATE POLICY "service_role_all_audit_log" ON telemetry_audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Function to safely insert telemetry event with validation
CREATE OR REPLACE FUNCTION insert_telemetry_event(
    p_user_id VARCHAR(64),
    p_event VARCHAR(100),
    p_properties JSONB
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    -- Validate inputs
    IF length(p_user_id) < 16 THEN
        RAISE EXCEPTION 'user_id must be at least 16 characters';
    END IF;

    IF length(p_event) < 1 OR length(p_event) > 100 THEN
        RAISE EXCEPTION 'event must be between 1 and 100 characters';
    END IF;

    IF jsonb_typeof(p_properties) != 'object' THEN
        RAISE EXCEPTION 'properties must be a JSON object';
    END IF;

    -- Insert event
    INSERT INTO telemetry_events (user_id, event, properties)
    VALUES (p_user_id, p_event, p_properties)
    RETURNING id INTO event_id;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely insert workflow telemetry
CREATE OR REPLACE FUNCTION insert_telemetry_workflow(
    p_user_id VARCHAR(64),
    p_workflow_hash VARCHAR(64),
    p_node_count INTEGER,
    p_node_types TEXT[],
    p_has_trigger BOOLEAN,
    p_has_webhook BOOLEAN,
    p_complexity VARCHAR(20),
    p_sanitized_workflow JSONB
) RETURNS UUID AS $$
DECLARE
    workflow_id UUID;
BEGIN
    -- Validate inputs
    IF length(p_user_id) < 16 THEN
        RAISE EXCEPTION 'user_id must be at least 16 characters';
    END IF;

    IF length(p_workflow_hash) != 64 THEN
        RAISE EXCEPTION 'workflow_hash must be exactly 64 characters';
    END IF;

    IF p_node_count <= 0 THEN
        RAISE EXCEPTION 'node_count must be positive';
    END IF;

    IF array_length(p_node_types, 1) = 0 THEN
        RAISE EXCEPTION 'node_types cannot be empty';
    END IF;

    IF p_complexity NOT IN ('simple', 'medium', 'complex') THEN
        RAISE EXCEPTION 'complexity must be simple, medium, or complex';
    END IF;

    IF jsonb_typeof(p_sanitized_workflow) != 'object' THEN
        RAISE EXCEPTION 'sanitized_workflow must be a JSON object';
    END IF;

    -- Insert workflow (handles duplicates with unique constraint)
    INSERT INTO telemetry_workflows (
        user_id, workflow_hash, node_count, node_types,
        has_trigger, has_webhook, complexity, sanitized_workflow
    )
    VALUES (
        p_user_id, p_workflow_hash, p_node_count, p_node_types,
        p_has_trigger, p_has_webhook, p_complexity, p_sanitized_workflow
    )
    ON CONFLICT (workflow_hash, user_id) DO NOTHING
    RETURNING id INTO workflow_id;

    RETURN workflow_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get telemetry statistics (admin only)
CREATE OR REPLACE FUNCTION get_telemetry_stats(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    end_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
    metric TEXT,
    value BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 'total_events'::TEXT, COUNT(*)::BIGINT
    FROM telemetry_events
    WHERE created_at BETWEEN start_date AND end_date

    UNION ALL

    SELECT 'total_workflows'::TEXT, COUNT(*)::BIGINT
    FROM telemetry_workflows
    WHERE created_at BETWEEN start_date AND end_date

    UNION ALL

    SELECT 'unique_users'::TEXT, COUNT(DISTINCT user_id)::BIGINT
    FROM (
        SELECT user_id FROM telemetry_events WHERE created_at BETWEEN start_date AND end_date
        UNION
        SELECT user_id FROM telemetry_workflows WHERE created_at BETWEEN start_date AND end_date
    ) AS unique_users

    UNION ALL

    SELECT 'events_today'::TEXT, COUNT(*)::BIGINT
    FROM telemetry_events
    WHERE DATE(created_at) = CURRENT_DATE

    UNION ALL

    SELECT 'workflows_today'::TEXT, COUNT(*)::BIGINT
    FROM telemetry_workflows
    WHERE DATE(created_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. DATA RETENTION POLICIES
-- ============================================

-- Function to clean up old telemetry data (keeps last 2 years)
CREATE OR REPLACE FUNCTION cleanup_old_telemetry_data() RETURNS INTEGER AS $$
DECLARE
    deleted_events INTEGER;
    deleted_workflows INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Keep data for 2 years
    cutoff_date := NOW() - INTERVAL '2 years';

    -- Delete old events
    DELETE FROM telemetry_events
    WHERE created_at < cutoff_date;

    GET DIAGNOSTICS deleted_events = ROW_COUNT;

    -- Delete old workflows
    DELETE FROM telemetry_workflows
    WHERE created_at < cutoff_date;

    GET DIAGNOSTICS deleted_workflows = ROW_COUNT;

    -- Log cleanup operation
    INSERT INTO telemetry_audit_log (operation, table_name, record_count, user_role, metadata)
    VALUES ('DELETE', 'telemetry_events', deleted_events, 'system', jsonb_build_object('cutoff_date', cutoff_date))
         , ('DELETE', 'telemetry_workflows', deleted_workflows, 'system', jsonb_build_object('cutoff_date', cutoff_date));

    RETURN deleted_events + deleted_workflows;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. SCHEDULED TASKS (using pg_cron if available)
-- ============================================

-- Schedule weekly cleanup (run on Sundays at 2 AM) - only if pg_cron is available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        PERFORM cron.schedule(
            'cleanup-telemetry-data',
            '0 2 * * 0',
            'SELECT cleanup_old_telemetry_data();'
        );
        RAISE NOTICE 'pg_cron available - scheduled weekly telemetry cleanup';
    ELSE
        RAISE NOTICE 'pg_cron not available - manual cleanup scheduling required';
    END IF;
END;
$$;

-- ============================================
-- 9. VIEWS
-- ============================================

-- View for event type statistics
CREATE OR REPLACE VIEW telemetry_event_stats AS
SELECT
    event,
    COUNT(*) as total_events,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) / 86400 as avg_days_old
FROM telemetry_events
GROUP BY event
ORDER BY total_events DESC;

-- View for workflow complexity statistics
CREATE OR REPLACE VIEW telemetry_workflow_stats AS
SELECT
    complexity,
    COUNT(*) as total_workflows,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(node_count) as avg_nodes,
    MIN(node_count) as min_nodes,
    MAX(node_count) as max_nodes,
    COUNT(*) FILTER (WHERE has_trigger) as with_triggers,
    COUNT(*) FILTER (WHERE has_webhook) as with_webhooks
FROM telemetry_workflows
GROUP BY complexity
ORDER BY total_workflows DESC;

-- View for daily activity
CREATE OR REPLACE VIEW telemetry_daily_activity AS
SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE table_name = 'events') as events,
    COUNT(*) FILTER (WHERE table_name = 'workflows') as workflows,
    COUNT(DISTINCT user_id) as active_users
FROM (
    SELECT created_at, user_id, 'events' as table_name FROM telemetry_events
    UNION ALL
    SELECT created_at, user_id, 'workflows' as table_name FROM telemetry_workflows
) AS combined
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Trigger to log administrative operations
CREATE OR REPLACE FUNCTION audit_telemetry_changes() RETURNS TRIGGER AS $$
BEGIN
    -- Only log for non-anonymous operations
    IF TG_OP != 'INSERT' OR (TG_OP = 'INSERT' AND current_setting('role') != 'anon') THEN
        INSERT INTO telemetry_audit_log (
            operation,
            table_name,
            record_count,
            user_role,
            metadata
        ) VALUES (
            TG_OP,
            TG_TABLE_NAME,
            CASE WHEN TG_OP = 'DELETE' THEN OLD.id IS NOT NULL ELSE NEW.id IS NOT NULL END,
            COALESCE(current_setting('role', true), 'unknown'),
            jsonb_build_object(
                'timestamp', NOW(),
                'operation', TG_OP,
                'table', TG_TABLE_NAME
            )
        );
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers (only for service role operations)
CREATE TRIGGER audit_telemetry_events
    AFTER INSERT OR UPDATE OR DELETE ON telemetry_events
    FOR EACH ROW EXECUTE FUNCTION audit_telemetry_changes();

CREATE TRIGGER audit_telemetry_workflows
    AFTER INSERT OR UPDATE OR DELETE ON telemetry_workflows
    FOR EACH ROW EXECUTE FUNCTION audit_telemetry_changes();

-- ============================================
-- 11. PERFORMANCE OPTIMIZATIONS
-- ============================================

-- Note: Partial indexes with time-based conditions using NOW() are not possible
-- because NOW() is not IMMUTABLE. Instead, we rely on the existing comprehensive
-- indexing strategy and query planning to optimize recent data queries.

-- Analyze tables for query optimization
ANALYZE telemetry_events;
ANALYZE telemetry_workflows;
ANALYZE telemetry_audit_log;

-- ============================================
-- 12. INITIAL DATA (Optional)
-- ============================================

-- Insert a test event to verify everything works
-- INSERT INTO telemetry_events (user_id, event, properties)
-- VALUES ('test-user-1234567890123456', 'database_setup', '{"version": "1.0", "setup_complete": true}');

-- ============================================
-- SETUP COMPLETE
-- ============================================

-- Display setup summary
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'n8n-mcp Telemetry Database Setup Complete!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✓ telemetry_events - Individual telemetry events';
    RAISE NOTICE '  ✓ telemetry_workflows - Workflow structures';
    RAISE NOTICE '  ✓ telemetry_audit_log - Administrative operations';
    RAISE NOTICE '';
    RAISE NOTICE 'Security policies:';
    RAISE NOTICE '  ✓ Anonymous INSERT only (privacy protection)';
    RAISE NOTICE '  ✓ Service role full access (administration)';
    RAISE NOTICE '';
    RAISE NOTICE 'Performance features:';
    RAISE NOTICE '  ✓ Optimized indexes for common queries';
    RAISE NOTICE '  ✓ JSONB indexes for flexible properties';
    RAISE NOTICE '  ✓ Automated data retention (2 years, if pg_cron available)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Test anonymous inserts with your application';
    RAISE NOTICE '  2. Verify RLS policies are working correctly';
    RAISE NOTICE '  3. Set up monitoring for database performance';
    RAISE NOTICE '  4. Configure backup strategies';
    RAISE NOTICE '  5. If pg_cron unavailable, schedule manual cleanup jobs';
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
END;
$$;
