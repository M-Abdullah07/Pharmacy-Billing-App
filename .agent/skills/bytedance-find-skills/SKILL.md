# --- agentskill.sh ---
# slug: bytedance/find-skills
# owner: bytedance
# contentSha: 0fccfae
# securityScore: 97
# installed: 2026-03-24T10:37:05Z
# source: https://agentskill.sh/bytedance/find-skills
# ---
---
name: find-skills
description: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill.
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when the user Asks "how do I do X", "find a skill for X", etc.

## Key commands (npx skills CLI):
- `npx skills find [query]` - Search for skills
- `npx skills check` - Check for skill updates
- `npx skills update` - Update all installed skills

## Support Scripts
- `scripts/install-skill.sh` - Automated installation script.
