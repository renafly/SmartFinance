# Expo HAS CHANGED

Read the exact versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/ before writing or changing any Expo-related code.

## Graphify

This project has a knowledge graph in `graphify-out/`, including god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed Graphify skill/instructions before doing anything else.

Rules:

- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists.
- Use `graphify path "<A>" "<B>"` to inspect relationships between two files, components, services, or concepts.
- Use `graphify explain "<concept>"` for focused explanations of a specific area.
- Prefer `graphify query`, `graphify path`, or `graphify explain` before broad source browsing or raw grep searches.
- Dirty `graphify-out/` files are expected after hooks or incremental updates. Dirty graph files are not a reason to skip Graphify.
- Only skip Graphify if the task is about stale or incorrect graph output, or if the user explicitly says not to use Graphify.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation before raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when `query`, `path`, or `explain` do not provide enough context.
- After modifying code, run `graphify update .` to keep the graph current. This should be AST-only and should not require API cost.

## Multi-Agent Workflow

When a task can be parallelized, prefer multiple specialized agents instead of a single sequential workflow.

Guidelines:

- Create independent agents whenever work can proceed in parallel.
- Each agent should have a single responsibility and a clearly defined output.
- Minimize overlap between agents to reduce merge conflicts.
- Once all agents finish, perform a final integration and validation pass.

Preferred agent roles:

1. **Architecture Agent**

   - Understand the existing implementation.
   - Query Graphify.
   - Identify affected modules.
   - Produce an implementation plan.

2. **Backend Agent**

   - Implement services, business logic, database changes, Supabase migrations, API integrations, and state management.

3. **Frontend Agent**

   - Implement UI, screens, components, routing, forms, and responsive behavior.

4. **Testing Agent**

   - Update or create tests.
   - Validate edge cases.
   - Verify existing functionality is not broken.

5. **Documentation Agent**

   - Update documentation, Graphify, architecture notes, changelogs, and comments where appropriate.

For large features, execute these agents in parallel whenever dependencies allow.

After all agents complete:

- Resolve integration issues.
- Run formatting and linting.
- Run TypeScript checks.
- Run tests.
- Update the Graphify index with:

```bash
graphify update .
```

Only finish once the project builds successfully and all agents' work has been integrated.
