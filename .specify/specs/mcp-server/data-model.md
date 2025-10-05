# Data Model: n8n-MCP Server

## Overview

The n8n-MCP server implements a comprehensive data model that bridges AI assistants with n8n's workflow automation platform. The data model is structured around four primary domains: MCP protocol entities, n8n workflow entities, validation results, and operational metadata.

## Core Entity Relationships

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Assistant  │─────│   MCP Server     │─────│   n8n Instance  │
│                 │     │                  │     │                 │
│ • Tool Requests │     │ • Protocol Hand. │     │ • API Endpoints │
│ • Session Mgmt  │     │ • Tool Routing   │     │ • Workflows      │
│ • Response Proc │     │ • Validation     │     │ • Executions     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   MCP Tools     │     │   Node Database  │     │   Templates     │
│                 │     │                  │     │                 │
│ • Discovery     │     │ • Node Schemas   │     │ • Configurations│
│ • Configuration │     │ • Properties     │     │ • Metadata      │
│ • Validation    │     │ • Operations     │     │ • Usage Stats   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## MCP Protocol Entities

### ToolDefinition
**Purpose**: Defines an MCP tool that AI assistants can invoke
**Attributes**:
- `name`: Unique identifier (e.g., "search_nodes", "validate_workflow")
- `description`: Human-readable purpose and functionality
- `inputSchema`: JSON Schema defining required/optional parameters
- `outputSchema`: JSON Schema defining response format (optional)
**Relationships**:
- Referenced by AI assistant tool calls
- Maps to handler functions in MCP server
- Includes validation rules and error handling

### ResourceDefinition
**Purpose**: Defines resources that can be read by AI assistants
**Attributes**:
- `uri`: Unique resource identifier (e.g., "n8n://nodes/slack")
- `name`: Human-readable resource name
- `description`: Purpose and content description
- `mimeType`: Content type for proper handling
**Relationships**:
- Provides access to n8n node documentation
- Supports structured data retrieval
- Enables resource discovery and browsing

### PromptDefinition
**Purpose**: Defines reusable prompt templates for AI assistants
**Attributes**:
- `name`: Template identifier
- `description`: Template purpose and usage
- `arguments`: Required/optional parameter definitions
**Relationships**:
- Supports complex multi-step workflows
- Provides consistent interaction patterns
- Enables specialized use cases (e.g., Code node guidance)

## n8n Workflow Entities

### WorkflowNode
**Purpose**: Represents a single node in an n8n workflow
**Attributes**:
- `id`: Unique node identifier within workflow
- `name`: Human-readable node name
- `type`: Node type (e.g., "n8n-nodes-base.slack")
- `typeVersion`: Version of the node type
- `position`: [x,y] coordinates in workflow canvas
- `parameters`: Configuration parameters (type-specific)
- `credentials`: Authentication references (optional)
- `disabled`: Whether node is active in workflow
- `notes`: Developer documentation (optional)
- `continueOnFail`: Error handling behavior
- `retryOnFail`: Retry configuration
**Relationships**:
- Belongs to Workflow entity
- Connects to other nodes via WorkflowConnection
- References node definitions in database
- May reference credentials for authentication

### WorkflowConnection
**Purpose**: Defines data flow between workflow nodes
**Structure**:
```
{
  "sourceNodeId": {
    "outputType": [
      [
        {
          "node": "targetNodeId",
          "type": "inputType",
          "index": 0
        }
      ]
    ]
  }
}
```
**Attributes**:
- Hierarchical structure mapping source to targets
- Support for multiple outputs and inputs
- Indexed connections for complex routing
**Relationships**:
- Defines execution flow in workflows
- Enables parallel and conditional processing
- Supports complex branching logic

### Workflow
**Purpose**: Complete n8n workflow definition
**Attributes**:
- `id`: Unique workflow identifier (API-generated)
- `name`: Human-readable workflow name
- `nodes`: Array of WorkflowNode objects
- `connections`: WorkflowConnection structure
- `active`: Whether workflow is enabled for execution
- `settings`: Execution configuration (timezone, timeouts, etc.)
- `tags`: Categorization and filtering tags
- `staticData`: Persistent workflow data
**Relationships**:
- Contains multiple WorkflowNode entities
- Defines connection topology
- Supports execution via n8n API
- Includes metadata for management

### Execution
**Purpose**: Records of workflow execution instances
**Attributes**:
- `id`: Unique execution identifier
- `workflowId`: Reference to parent workflow
- `status`: ExecutionStatus enum (success/error/waiting)
- `startedAt`: Execution start timestamp
- `stoppedAt`: Execution completion timestamp (optional)
- `finished`: Boolean completion flag
- `data`: Execution results and intermediate data
**Relationships**:
- Belongs to specific workflow
- Contains detailed execution logs
- Supports debugging and monitoring
- Enables performance analysis

## Validation & Quality Assurance Entities

### Node Validation Result
**Purpose**: Assessment of individual node configuration correctness
**Attributes**:
- `nodeType`: Type being validated
- `config`: Configuration object being tested
- `isValid`: Boolean validation result
- `errors`: Array of specific error messages
- `warnings`: Array of non-blocking issues
- `suggestions`: Array of improvement recommendations
**Relationships**:
- Validates against node database schemas
- Provides actionable feedback for AI assistants
- Supports multiple validation profiles (minimal, runtime, strict)

### Workflow Validation Result
**Purpose**: Comprehensive workflow structure and logic validation
**Attributes**:
- `workflow`: Complete workflow object
- `isValid`: Overall validation result
- `nodeErrors`: Per-node validation issues
- `connectionErrors`: Topology and routing problems
- `expressionErrors`: n8n expression syntax issues
- `performanceWarnings`: Execution efficiency concerns
**Relationships**:
- Validates complete workflow integrity
- Checks connection consistency
- Verifies expression syntax
- Assesses AI tool compatibility

## Operational Metadata Entities

### Database Statistics
**Purpose**: Coverage and performance metrics for node database
**Attributes**:
- `totalNodes`: Total nodes in database
- `nodesWithProperties`: Nodes with property schemas
- `nodesWithDocumentation`: Nodes with documentation
- `aiCapableNodes`: Nodes supporting AI tool functionality
- `templateConfigurations`: Extracted real-world examples
- `averageQueryTime`: Performance benchmark
**Relationships**:
- Provides system health monitoring
- Supports coverage analysis
- Enables performance tracking

### Template Metadata
**Purpose**: Enhanced information about workflow templates
**Attributes**:
- `id`: Unique template identifier
- `name`: Template display name
- `description`: Purpose and functionality
- `complexity`: Difficulty level (simple/advanced)
- `audience`: Target users (developers/marketers/analysts)
- `services`: Required external services
- `maxSetupMinutes`: Estimated configuration time
- `tags`: Categorization tags
- `author`: Template creator information
**Relationships**:
- Enables intelligent template discovery
- Supports filtering by use case and complexity
- Provides usage statistics and ratings

## Data Flow Patterns

### AI Assistant Query Flow
```
1. AI Assistant → MCP Tool Request
2. MCP Server → Tool Handler Routing
3. Tool Handler → Database/Service Layer
4. Service Layer → Data Retrieval/Processing
5. Tool Handler → Response Formatting
6. MCP Server → AI Assistant Response
```

### Node Discovery Flow
```
1. search_nodes() → Full-text search
2. Database → Node matching and ranking
3. Results → Formatted tool response
4. AI Assistant → Node selection and configuration
```

### Workflow Validation Flow
```
1. validate_workflow() → Complete workflow analysis
2. Multiple validators → Parallel validation checks
3. Results aggregation → Structured error reporting
4. AI Assistant → Configuration corrections
```

### Template Usage Flow
```
1. search_templates() → Metadata filtering
2. Template database → Matching results
3. Configuration extraction → Real-world examples
4. AI Assistant → Workflow adaptation
```

## Data Integrity & Consistency

### Type Safety
- Comprehensive TypeScript interfaces for all entities
- Runtime type validation where needed
- Schema validation against n8n specifications
- Backward compatibility handling for API changes

### Referential Integrity
- Foreign key relationships maintained
- Cascade updates for dependent entities
- Validation of cross-entity references
- Error handling for broken relationships

### Performance Optimization
- Indexed database queries for fast retrieval
- LRU caching for frequently accessed data
- Efficient data structures and algorithms
- Memory management and leak prevention

## Future Extensibility

### Plugin Architecture
- Modular service registration system
- Extensible tool and resource definitions
- Custom validation rule injection
- Third-party node package support

### Advanced Features
- Real-time n8n synchronization
- Collaborative workflow editing
- Advanced AI-assisted configuration
- Predictive performance optimization

This data model provides a robust foundation for AI assistant integration with n8n's workflow automation platform, enabling comprehensive access to nodes, templates, and validation capabilities while maintaining high performance and reliability standards.
