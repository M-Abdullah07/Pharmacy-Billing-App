# --- agentskill.sh ---
# slug: curiositech/mermaid-graph-renderer
# owner: curiositech
# contentSha: 9a03b2c
# installed: 2026-03-24T22:29:00Z
# source: https://agentskill.sh/curiositech/mermaid-graph-renderer
# ---
---
name: mermaid-graph-renderer
description: Renders Mermaid diagrams to SVG, PNG, and PDF. Use for "render mermaid", "export diagram", "mermaid to png".
allowed-tools: Read,Write,Edit,Bash
---

# Mermaid Graph Renderer

Expert at generating valid Mermaid syntax and rendering it to high-quality images.

## When to Use
- User needs a Mermaid diagram (Flowchart, Sequence, ER, etc.)
- User wants to export a diagram to PNG/SVG/PDF
- User needs to fix Mermaid syntax errors

## Best Practices
- Always use the `erDiagram` type for SQL schemas.
- Quote names with special characters.
- Use `||--o{` style relationship notation for clarity.
- For PNG export, utilize external tools if available or provide the raw Mermaid code for rendering.
