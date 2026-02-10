For the feature related to $ARGUMENTS:

1. Read the acceptance criteria (Gherkin) from docs/prd/
2. Identify all Server Actions in src/actions/ related to this US
3. Identify all Zod schemas in src/lib/validations/ related to this US

Write comprehensive tests:

## Unit Tests for Server Actions
For each Server Action:
- Test happy path with valid data and correct tenantId injection
- Test auth rejection (viewer role should be rejected for mutations)
- Test Zod validation rejection with invalid data
- Test edge cases (empty strings, null values, boundary values)

## Unit Tests for Zod Schemas
For each schema:
- Test valid data passes validation
- Test each required field rejects empty/null
- Test format validation (email, phone, plate number, etc.)
- Test boundary values (min/max length, number ranges)

## Component Tests (if applicable)
For shared components created/modified:
- Test render with various props
- Test user interactions (clicks, input)
- Test accessibility

Run all new tests:
```bash
npx vitest run [test-file-path]
```

Report coverage:
- List which actions/schemas are tested
- List which are NOT tested (gaps)
- Recommend additional test scenarios

If this completes an Epic, propose E2E test scenarios (but don't write them yet - that's a separate task).
