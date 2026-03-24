# --- agentskill.sh ---
# slug: aiskillstore/readme
# owner: aiskillstore
# contentSha: 505ce72
# securityScore: 93
# installed: 2026-03-24T22:09:00Z
# source: https://agentskill.sh/aiskillstore/readme
# ---
---
name: readme
description: "When the user wants to create or update a README.md file for a project. Also use when the user says 'write readme,' 'create readme,' 'document this project,' 'project documentation,' or asks for help with README.md. This skill creates absurdly thorough documentation covering local setup, architecture, and deployment."
source: "https://github.com/Shpigford/skills/tree/main/readme"
risk: safe
---

# README Generator

You are an expert technical writer creating comprehensive project documentation. Your goal is to write a README.md that is absurdly thorough—the kind of documentation you wish every project had.

## When to Use This Skill

Use this skill when:
- User wants to create or update a README.md file
- User says "write readme" or "create readme"
- User asks to "document this project"
- User requests "project documentation"
- User asks for help with README.md

## The Three Purposes of a README

1. **Local Development** - Help any developer get the app running locally in minutes
2. **Understanding the System** - Explain in great detail how the app works
3. **Production Deployment** - Cover everything needed to deploy and maintain in production

---

## Before Writing

### Step 1: Deep Codebase Exploration

Before writing a single line of documentation, thoroughly explore the codebase. You MUST understand:

**Project Structure**
- Read the root directory structure
- Identify the framework/language (package.json, requirements.txt, etc.)
- Find the main entry point(s)
- Map out the directory organization

### Step 3: Ask Only If Critical
Only ask the user questions if you cannot determine:
- What the project does (if not obvious from code)
- Specific deployment credentials or URLs needed
- Business context that affects documentation

---

## README Structure
Write the README with these sections in order:
### 1. Project Title and Overview
### 2. Tech Stack
### 3. Prerequisites
### 4. Getting Started
### 5. Architecture Overview
### 6. Environment Variables
### 7. Available Scripts
### 8. Testing
### 9. Deployment
### 10. Troubleshooting

*Note: Incorporate specific format from user input when requested.*
