# Quick Start: n8n-MCP Server Implementation

## Implementation Overview

The n8n-MCP server is a fully implemented Model Context Protocol server that provides AI assistants with comprehensive access to n8n's workflow automation capabilities. This guide covers the existing implementation and how to work with it.

## Current Deployment Options

### Option 1: npx (Fastest - No Installation!)
**Status**: ✅ Fully Implemented

```bash
# Run directly with npx (no installation needed!)
npx n8n-mcp
```

**Configuration for Claude Desktop**:
```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true"
      }
    }
  }
}
```

### Option 2: Docker (Isolated Environment)
**Status**: ✅ Fully Implemented

```bash
# Pull the optimized Docker image (~280MB)
docker pull ghcr.io/czlonkowski/n8n-mcp:latest

# Run with Docker
docker run -i --rm --init \
  -e MCP_MODE=stdio \
  -e LOG_LEVEL=error \
  -e DISABLE_CONSOLE_OUTPUT=true \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

**Configuration for Claude Desktop**:
```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", "--init",
        "-e", "MCP_MODE=stdio",
        "-e", "LOG_LEVEL=error",
        "-e", "DISABLE_CONSOLE_OUTPUT=true",
        "ghcr.io/czlonkowski/n8n-mcp:latest"
      ]
    }
  }
}
```

### Option 3: Local Development Setup
**Status**: ✅ Fully Implemented

```bash
# 1. Clone and setup
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp
npm install
npm run build
npm run rebuild

# 2. Test it works
npm start
```

## Configuration Options

### Basic Configuration (Documentation Only)
```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true"
      }
    }
  }
}
```

### Full Configuration (With n8n Management)
```json
{
  "mcpServers": {
    "n8n-mcp": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "DISABLE_CONSOLE_OUTPUT": "true",
        "N8N_API_URL": "https://your-n8n-instance.com",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Core Capabilities

### Node Discovery & Search
**Status**: ✅ Fully Implemented

```javascript
// Search for nodes by keyword
await search_nodes({ query: "slack", limit: 5 })

// List nodes by category
await list_nodes({ category: "communication" })

// Get AI-capable nodes
await list_ai_tools()

// Get comprehensive node information
await get_node_info({ nodeType: "n8n-nodes-base.slack" })

// Get essential properties only (95% smaller)
await get_node_essentials({ nodeType: "n8n-nodes-base.slack" })
```

### Node Configuration & Validation
**Status**: ✅ Fully Implemented

```javascript
// Validate node configuration
await validate_node_minimal({
  nodeType: "n8n-nodes-base.slack",
  config: {
    resource: "message",
    operation: "post"
  }
})

// Full validation with suggestions
await validate_node_operation({
  nodeType: "n8n-nodes-base.slack",
  config: { /* full config */ },
  profile: "runtime"
})

// Validate complete workflow
await validate_workflow({
  workflow: {
    nodes: [/* nodes */],
    connections: {/* connections */}
  }
})
```

### Template Library
**Status**: ✅ Fully Implemented

```javascript
// Search templates
await search_templates({ query: "webhook slack" })

// Filter by metadata
await search_templates_by_metadata({
  complexity: "simple",
  targetAudience: "marketers"
})

// Get complete template
await get_template({ templateId: "123", mode: "full" })

// Get templates for specific task
await get_templates_for_task({ task: "webhook_processing" })
```

### n8n Workflow Management (Optional)
**Status**: ✅ Fully Implemented (Requires API credentials)

```javascript
// Create new workflow
await n8n_create_workflow({
  name: "Webhook to Slack",
  nodes: [/* node definitions */],
  connections: {/* connection structure */}
})

// Update workflow with diff operations
await n8n_update_partial_workflow({
  id: "workflow-id",
  operations: [
    {
      type: "updateNode",
      nodeName: "Slack",
      updates: { parameters: { channel: "#general" } }
    }
  ]
})

// Execute workflow via webhook
await n8n_trigger_webhook_workflow({
  webhookUrl: "https://n8n-instance.com/webhook/abc123",
  httpMethod: "POST",
  data: { message: "Hello from MCP!" }
})
```

## Development Workflow

### Code Quality Standards
- **TypeScript**: Strict type checking enabled
- **Testing**: 80%+ coverage with 2,883 tests
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code style

### Testing Commands
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test suites
npm run test:unit           # Unit tests (2,526 tests)
npm run test:integration    # Integration tests (357 tests)
npm run test:e2e           # End-to-end tests

# Run performance benchmarks
npm run benchmark
```

### Building & Validation
```bash
# Build TypeScript
npm run build

# Rebuild node database
npm run rebuild

# Validate node data
npm run validate

# Check TypeScript types
npm run typecheck
```

## Performance Characteristics

### Query Performance
- **Node search**: <100ms average response time
- **Node essentials**: <50ms retrieval
- **Validation**: <200ms for complex workflows
- **Template search**: <150ms with metadata filtering

### Resource Usage
- **Memory footprint**: <500MB for full node database
- **Startup time**: <5 seconds with database loading
- **Concurrent sessions**: Supports multiple AI assistants
- **Database size**: ~15MB optimized SQLite

## Troubleshooting

### Common Issues

**MCP Server Not Connecting**
```bash
# Check if MCP server starts correctly
npm start

# Test MCP protocol directly
npm run test:mcp-stdio

# Check Claude Desktop logs for errors
```

**n8n API Integration Issues**
```bash
# Test API connectivity
npm run test:n8n-integration

# Verify API credentials
curl -H "X-N8N-API-KEY: your-key" https://your-n8n-instance.com/api/v1/workflows

# Check n8n instance health
curl https://your-n8n-instance.com/healthz
```

**Performance Issues**
```bash
# Run performance benchmarks
npm run benchmark

# Check memory usage
npm run test:docker:performance

# Monitor database queries
npm run test:search-improvements
```

### Docker Troubleshooting
```bash
# Check Docker image
docker run --rm ghcr.io/czlonkowski/n8n-mcp:latest --version

# Test with Docker Compose
docker-compose -f docker-compose.test-n8n.yml up -d

# Check container logs
docker logs n8n-mcp-container
```

## Advanced Configuration

### Environment Variables
```bash
# MCP Configuration
MCP_MODE=stdio|http           # Transport mode
LOG_LEVEL=error|warn|info|debug  # Logging verbosity
DISABLE_CONSOLE_OUTPUT=true   # Clean output for MCP

# n8n API Integration (Optional)
N8N_API_URL=https://instance.com  # n8n instance URL
N8N_API_KEY=your-api-key         # API authentication

# Performance Tuning
NODE_ENV=production               # Production optimizations
TEST_MAX_WORKERS=4               # Test parallelization
```

### Custom Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  n8n-mcp:
    image: ghcr.io/czlonkowski/n8n-mcp:latest
    environment:
      - MCP_MODE=http
      - N8N_API_URL=https://your-n8n.com
      - N8N_API_KEY=your-key
    ports:
      - "3000:3000"
    restart: unless-stopped
```

## Monitoring & Maintenance

### Health Checks
```javascript
// Check MCP server health
await tools_documentation({ topic: "n8n_health_check" })

// Get database statistics
await get_database_statistics()

// Monitor performance
await tools_documentation({ topic: "performance" })
```

### Automated Updates
```bash
# Update n8n package compatibility
npm run update:n8n

# Check for n8n updates
npm run update:n8n:check

# Update dependencies
npm update

# Rebuild database with latest nodes
npm run rebuild
```

## Support & Resources

### Documentation
- [Installation Guide](./docs/INSTALLATION.md)
- [MCP Essentials](./docs/MCP_ESSENTIALS_README.md)
- [Testing Strategy](./docs/testing-strategy.md)
- [Docker Troubleshooting](./docs/DOCKER_TROUBLESHOOTING.md)

### Community Resources
- [GitHub Issues](https://github.com/czlonkowski/n8n-mcp/issues)
- [n8n Community](https://community.n8n.io)
- [MCP Specification](https://modelcontextprotocol.io)

### Performance Benchmarks
- **Test Coverage**: 80%+ with 2,883 tests
- **Response Time**: <100ms for critical operations
- **Memory Usage**: <500MB database footprint
- **Uptime**: 99.9% for documentation services

This implementation provides AI assistants with comprehensive access to n8n's workflow automation capabilities through a robust MCP server architecture.
