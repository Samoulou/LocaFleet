Review all uncommitted changes (git diff).

Use the security-reviewer subagent for security analysis.
Use the db-analyst subagent for query performance review.

Check for:
- Type safety (no `any`, proper generics)
- Security (tenantId filtering on EVERY query, auth checks on mutations)
- Error handling (no swallowed errors, proper user feedback)
- Swiss formatting (CHF with apostrophe 1'250.00, DD.MM.YYYY dates)
- UI consistency with design system (colors, badges, patterns A/B/C/D)
- Test coverage: every new Server Action and Zod schema MUST have tests
- Adherence to LocaFleet conventions from CLAUDE.md
- N+1 queries and missing indexes
- Soft delete compliance (deletedAt IS NULL checks)

List issues found with file:line references and severity (CRITICAL/HIGH/MEDIUM/LOW).
Suggest specific fixes for each issue.
