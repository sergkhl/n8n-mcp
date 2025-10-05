<!--
Sync Impact Report - Constitution Amendment 2025-10-05
Version change: template → 1.0.0 (MAJOR: First codified constitution with comprehensive principles)
Modified principles: All 5 principles created from repository analysis
  - I. Code Quality Standards (NEW)
  - II. Testing Discipline (NEW)
  - III. User Experience Consistency (NEW)
  - IV. Performance Requirements (NEW)
  - V. Development Workflow Excellence (NEW)
Added sections: Technical Standards, Development Workflow
Removed sections: None
Templates requiring updates: ✅ .specify/templates/plan-template.md (constitution version reference updated)
Follow-up TODOs: None - all template references updated
-->
# n8n-MCP Constitution
<!-- MCP Server for AI Assistant Integration with n8n Workflow Automation -->

## Core Principles

### I. Code Quality Standards
**TypeScript-First Development**: All source code MUST be written in TypeScript with strict type checking enabled. No JavaScript files permitted except for build tooling and legacy compatibility layers. Type coverage must exceed 95%.

**Comprehensive Testing**: Projects must maintain 80%+ code coverage across unit, integration, and end-to-end tests. Test-first development (TDD) is mandatory - tests MUST be written before implementation and MUST fail initially.

**Error Handling Excellence**: All functions must implement proper error handling with structured logging. Errors must be typed, actionable, and provide clear recovery guidance to users.

### II. Testing Discipline
**Multi-Layer Testing Strategy**: Every component requires unit tests (70% of test suite), integration tests (20%), and end-to-end tests (10%). Tests must be isolated, reliable, and execute within performance budgets.

**Performance Testing**: Critical operations must be benchmarked with automated regression detection. Response times must not exceed established thresholds, with performance tests running in CI/CD pipeline.

**Test Quality Gates**: All pull requests must pass complete test suite. Test failures block merges. Flaky tests are unacceptable and must be fixed immediately.

### III. User Experience Consistency
**Universal Deployment Options**: Projects must support multiple deployment methods (npx, Docker, cloud platforms) with consistent behavior and configuration interfaces. User choice must not compromise functionality.

**Comprehensive Documentation**: Every feature requires setup guides, troubleshooting documentation, and usage examples. Documentation must be versioned with code and tested for accuracy.

**Accessibility Standards**: User interfaces and CLI tools must be accessible, with clear error messages, progress indicators, and help systems. Internationalization support required for user-facing text.

### IV. Performance Requirements
**Sub-100ms Response Times**: Critical user operations must complete within 100ms. Non-critical operations within 500ms. Performance budgets are hard limits, not guidelines.

**Resource Efficiency**: Memory usage must remain under 500MB for full application operation. CPU usage must not exceed 200% on standard hardware. Resource leaks are unacceptable.

**Scalability Architecture**: Systems must handle 10x current load without architectural changes. Horizontal scaling must be supported through configuration.

### V. Development Workflow Excellence
**Automated Quality Assurance**: CI/CD pipelines must include automated testing, security scanning, dependency updates, and performance regression detection. Manual quality gates are prohibited.

**Semantic Versioning**: All releases must follow semantic versioning with automated changelog generation. Breaking changes require migration guides and deprecation periods.

**Security First**: Dependencies must be kept current with automated security updates. Security vulnerabilities must be addressed within 48 hours of disclosure.

## Technical Standards

**Technology Stack Requirements**:
- Node.js LTS versions only (current + previous LTS)
- TypeScript 5.x with strict configuration
- Vitest for testing with coverage thresholds
- Docker for containerization with multi-platform builds
- GitHub Actions for CI/CD with security scanning

**Code Organization**:
- Source code in `/src` with clear module boundaries
- Tests in `/tests` with unit/integration/e2e separation
- Scripts in `/scripts` with automated validation
- Documentation in `/docs` with version control
- Configuration in root with environment-specific overrides

**Quality Gates**:
- ESLint with TypeScript rules (zero warnings allowed)
- Prettier for consistent formatting
- License compliance checking
- Dependency vulnerability scanning
- Performance regression testing

## Development Workflow

**Pull Request Process**:
1. Feature branches with descriptive names
2. Comprehensive test coverage for new code
3. Documentation updates for user-facing changes
4. Performance impact assessment
5. Security review for external integrations
6. Minimum two approvals from maintainers

**Release Process**:
1. Automated semantic versioning
2. Changelog generation from commits
3. Multi-platform build verification
4. Security vulnerability scanning
5. Performance benchmark validation
6. Automated deployment to supported platforms

**Maintenance Requirements**:
- Weekly dependency updates
- Monthly security audits
- Quarterly performance reviews
- Continuous documentation updates
- User feedback integration

## Governance

**Constitution Authority**: This constitution supersedes all other project guidelines and practices. All development decisions must demonstrate compliance with these principles.

**Amendment Process**: Constitution amendments require:
1. Clear problem statement with current principle violations
2. Proposed principle changes with rationale
3. Impact assessment on existing code and processes
4. Approval from all active maintainers
5. Migration plan for existing code
6. Documentation of changes in changelog

**Compliance Verification**: All pull requests must include constitution compliance checklist. Automated tools verify adherence to quality standards. Non-compliant changes are blocked from merge.

**Enforcement**: Maintainers are responsible for constitution enforcement. Violations require immediate remediation or feature rollback. Repeated violations may result in contribution restrictions.

**Versioning Policy**: Constitution follows semantic versioning. MAJOR versions require complete project migration. MINOR versions add principles without breaking existing compliance. PATCH versions clarify existing principles.

**Guideline References**: Use `docs/testing-strategy.md`, `docs/CHANGELOG.md`, and project README for implementation guidance. These documents provide concrete examples of constitutional principles in practice.

**Version**: 1.0.0 | **Ratified**: 2025-10-05 | **Last Amended**: 2025-10-05
