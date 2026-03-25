---
name: adaptive-reasoning
description: Automatically assess task complexity and adjust reasoning level. Triggers on every user message to evaluate whether extended thinking (reasoning mode) would improve response quality.
---

# Adaptive Reasoning (v2.0)

Self-assess complexity before responding. Dynamically adjust reasoning level for optimal accuracy vs. latency.

## Decision Thresholds

| Score | Complexity | Action |
| :--- | :--- | :--- |
| **0-2** | Trivial | Stay fast. No reasoning needed. |
| **3-5** | Moderate | Standard response with light internal deliberation. |
| **6-7** | High | Activate extended thinking (Reasoning: ON). Append: 🧠 |
| **8-10** | Critical | Deep thinking (Reasoning: ON). Append: 🧠🔥 |

## Core Capabilities

### 1. Multi-Step Logic Signals
Detects proof chains, complex debugging, and architecture design tasks.

### 2. Ambiguity Detection
Identifies "it depends" scenarios and trade-off analyses early.

### 3. Automatic Escalation
Triggers reasoning mode (e.g., `/reasoning on`) internally when a high-complexity threshold is met.

## How to Use

This skill is a **mental pre-processor**. Use it to evaluate every incoming prompt before responding.

**Success Indicator**: Append a visual indicator at the very end of your response to signal the reasoning depth:
- **🧠**: Thinking mode active (score 6-7).
- **🧠🔥**: Deep thinking mode (score 8+).
- **Fast Mode**: No icon (score 0-5).

## Visual Feedback Example
> "Design a caching strategy for this API with these constraints..."
> -> Enable reasoning. Thoughtful response ends with: 🧠
