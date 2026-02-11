Read the user story $ARGUMENTS from docs/prd/.
Read the MVP workflow from docs/prd/23-mvp-workflow.md — this is the **primary reference** for Sprint 3-4 user stories (US-MVP-*). It supersedes Epics 3, 4, 5, 6 for the MVP phase. Always cross-check your implementation against this document for contract statuses, schema changes, business rules, and the overall rental flow.
Read the schema from src/db/schema.ts.
Read the UI specs from docs/prd/3-user-interface-design-goals.md.

First, enter Plan Mode and propose an implementation plan.
Wait for my approval before coding.

Your plan must include:
1. Files to create/modify (with full paths)
2. Components needed (new or existing to reuse)
3. Server Actions needed (with function signatures)
4. Validation schemas needed (Zod schemas with fields)
5. Unit tests needed (list each test file and what scenarios it tests)
6. E2E scenarios if this completes an Epic
7. Edge cases to handle

After I approve and you implement:
1. Write unit tests for every Server Action created/modified
2. Write unit tests for every Zod validation schema created/modified
3. Run `npx vitest run` on the new test files to verify they pass
4. Run `npx tsc --noEmit` to verify type safety
5. Review your own code for security (tenantId filtering) and edge cases
6. Run `npm run lint` to check for lint errors
