# --- agentskill.sh ---
# slug: majiayu000/architecture-validate-architecture
# owner: majiayu000
# contentSha: 3c2159f
# securityScore: 100
# installed: 2026-03-24T21:47:00Z
# source: https://agentskill.sh/majiayu000/architecture-validate-architecture
# ---
---
name: architecture-validate-architecture
description: |
  Automates architecture validation for Clean Architecture, Hexagonal, Layered, and MVC patterns. Detects layer boundary violations, dependency rule breaches, and architectural anti-patterns. Use when asked to "validate architecture", "check layer boundaries", "architectural review", before major refactoring, or as pre-commit quality gate. Adapts to project's architectural style by reading ARCHITECTURE.md.
allowed-tools:
  - Read
  - Grep
  - Bash
  - Glob
---

# Validate Architecture

## Table of Contents

**Quick Start** → [When to Use](#when-to-use-this-skill) | [What It Does](#purpose) | [Simple Example](#quick-start)

**How to Implement** → [Validation Process](#validation-process) | [Architecture Rules](#architecture-specific-rules) | [Expected Output](#expected-outcomes)

**Patterns** → [Clean Architecture](#clean-architecture) | [Hexagonal](#hexagonal-architecture) | [Layered](#layered-architecture) | [MVC](#mvc-architecture)

**Help** → [Anti-Patterns](#common-anti-patterns-detected) | [Troubleshooting](#troubleshooting) | [Integration](#integration-points)

**Reference** → [Layer Dependencies](./references/reference.md) | [Diff-Aware Validation](./references/diff-aware-validation.md) | [Quick Reference](./references/diff-aware-validation-quickref.md)

---

## Purpose

Automates architecture validation for multiple architectural patterns (Clean Architecture, Hexagonal, Layered, MVC). Automatically detects the project's architectural style from ARCHITECTURE.md, scans all source files for import violations, validates dependency direction (inward only for Clean/Hexagonal), and reports violations with specific fixes. Adapts to any architectural pattern and provides actionable remediation guidance.

## Quick Start

**User asks:** "Validate my architecture" or "Check if this follows Clean Architecture"

**What happens:**
1. Reads project's `ARCHITECTURE.md` to identify architectural pattern
2. Scans all source files for import violations
3. Validates dependency direction (inward only for Clean/Hexagonal)
4. Reports violations with file:line:fix recommendations

**Result:** ✅ All checks passed OR ❌ Violations with specific fixes

## When to Use This Skill

Invoke this skill when:
- User asks "validate architecture", "check layer boundaries", "architectural review"
- Before major refactoring or structural changes
- As part of pre-commit quality gates
- After adding new dependencies to any layer
- Reviewing code for architecture compliance
- User mentions "Clean Architecture", "Hexagonal", "Layered", or "MVC"

## Triggers

Trigger with phrases like:
- "validate architecture"
- "check layer boundaries"
- "architectural review"
- "validate my Clean Architecture"
- "check if this follows Hexagonal Architecture"
- "run architecture validation"
- "check for layer violations"
- "validate dependencies"
- "architectural compliance check"

## What This Skill Does

### Supported Architectural Patterns

This skill automatically adapts to:

1. **Clean Architecture** (Concentric layers: Domain → Application → Infrastructure → Interface)
2. **Hexagonal Architecture** (Ports and Adapters)
3. **Layered Architecture** (Presentation → Business → Data)
4. **MVC** (Model → View → Controller)

### Validation Checks

**1. Pattern Detection**
- Reads `ARCHITECTURE.md` or similar documentation
- Identifies architectural style and layer definitions
- Parses dependency rules and constraints

**2. Layer Boundary Validation**
- Scans all import statements in source files
- Checks for violations (e.g., Domain importing Infrastructure)
- Detects circular dependencies between layers

**3. Dependency Direction Validation**
- Verifies dependencies flow correctly (inward for Clean/Hexagonal)
- Ensures outer layers depend on inner, never reverse
- Validates domain/core has no external dependencies

**4. Pattern Compliance**
- Checks for required patterns (ServiceResult, Repository, etc.)
- Verifies naming conventions (Services in application/, etc.)
- Validates file organization matches architectural layers

**5. Anti-Pattern Detection**
- Domain importing database/framework code
- Application importing concrete infrastructure
- Circular dependencies between layers
- Business logic in interface/presentation layers

## Instructions

### Overview

Validating architecture involves a 5-step process:

1. **Identify Architecture** - Read ARCHITECTURE.md and detect pattern (Clean, Hexagonal, Layered, MVC)
2. **Extract Layer Definitions** - Map directory structure to architectural layers
3. **Scan Imports** - Analyze all import statements in source files
4. **Validate Rules** - Check dependency direction and layer boundaries
5. **Report Violations** - Generate actionable report with specific fixes

## Architecture-Specific Rules

This skill supports four architectural patterns with specific dependency rules:

### Clean Architecture
- **Dependency Rule**: Dependencies flow inward only (Interface → Application → Domain ← Infrastructure)
- **Layer Rules**: Domain is pure, Application orchestrates, Infrastructure implements, Interface is entry points

### Hexagonal Architecture
- **Dependency Rule**: Core has no dependencies, adapters depend on ports
- **Layer Rules**: Domain/Core is pure, Ports are interfaces, Adapters connect to external systems

### Layered Architecture
- **Dependency Rule**: Each layer depends only on layer below
- **Layer Rules**: Presentation → Business Logic → Data Access

### MVC Architecture
- **Dependency Rule**: Model is independent, View/Controller depend on Model
- **Layer Rules**: Model is independent, View depends on Model, Controller orchestrates

## Common Anti-Patterns Detected

This skill detects and provides fixes for common architectural violations:

1. **Domain Importing Infrastructure** - Domain layer importing database/framework code
2. **Application Importing Interfaces** - Application layer importing from API/UI layers
3. **Circular Dependencies** - Two or more modules importing each other
4. **Business Logic in Interface Layer** - Business rules and validation in API/UI code

## Integration Points

This skill integrates with:

- **Pre-Commit Hooks** - Block commits with architecture violations
- **CI/CD Pipeline** - Automated validation in GitHub Actions, GitLab CI
- **Quality Gates** - Part of comprehensive quality checks

## Expected Outcomes

### Success (No Violations)
When validation passes, you'll see confirmation that all layer boundaries are respected and dependencies flow correctly.

### Failure (Violations Found)
When violations are detected, you'll receive a detailed report including:
- Violation severity (CRITICAL, HIGH, MEDIUM, LOW)
- File path and line number
- Specific import statement causing the violation
- Recommended fix with explanation
- Impact assessment
