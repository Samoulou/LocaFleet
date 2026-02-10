Read the user story $ARGUMENTS from docs/prd/.

First, enter Plan Mode and propose an implementation plan.
Reference the relevant skills (locafleet-schema, locafleet-stack, locafleet-ui).
Wait for my approval before coding.

Your plan must include:
1. Files to create/modify
2. Components needed
3. Server Actions needed
4. Validation schemas needed (Zod)
5. Unit tests needed (list each test file and what it tests)
6. Edge cases to handle

After I approve and you implement:
1. Write unit tests for every Server Action created/modified
2. Write unit tests for every Zod validation schema created/modified
3. Run `npx vitest run` on the new test files to verify they pass
4. Run `npx tsc --noEmit` to verify type safety
5. Review your own code for security (tenantId filtering) and edge cases
6. Run `npm run lint` to check for lint errors
