---
name: nowait-reasoning-optimizer
description: Implements the NOWAIT technique for efficient reasoning in R1-style LLMs. Use when optimizing inference of reasoning models (QwQ, DeepSeek-R1, Phi4-Reasoning, Qwen3, Kimi-VL, QvQ).
---

# NOWAIT Reasoning Optimizer

Advanced inference-time optimization for DeepSeek-R1 and O1-style "Reasoning" models.

## Core Capabilities

### 1. Token Suppression (NOWAIT)
Suppress specific "reflection" or "thinking" tokens (like *wait*, *rethink*, *scratchpad*) that often lead to excessive latency without proportional gains in logic for simpler tasks.

### 2. Efficiency Gains
- **CoT Token Reduction**: 27-51% (on average).
- **Inference Speed**: Drastically reduces TTFT (Time To First Token) and TBT (Time Between Tokens) in long reasoning chains.
- **Cost Savings**: Significant reduction in output token costs for high-volume production deployments.

## How to Use

Use this skill when designing or deploying prompts for R1-class models where speed is a priority.

**Example Triggers:**
- "Optimize reasoning for my R1 deployment"
- "Reduce token usage in long reasoning chains"
- "Implement NOWAIT logit processor"

## Success Metrics
- **Accuracy**: Preserves logical correctness (Zero-loss).
- **Latency**: Measures reduction in total generation time.
- **Information Density**: Higher bits-per-token ratio.
