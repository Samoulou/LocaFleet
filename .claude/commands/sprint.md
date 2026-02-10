# Sprint Planning

Read the Epic file at docs/prd/$ARGUMENTS.

For each User Story in this Epic, create a Task with:
- Title: US number + short description
- Description: the acceptance criteria from the PRD (Gherkin format)
- Dependencies: which US must be completed before this one

Extract all User Stories from the Epic document.
Identify dependencies based on:
- Database schema dependencies (e.g., clients table needed before contracts)
- UI dependencies (e.g., list page needed before detail page)
- Logical flow (e.g., create before update/delete)

Show me the task list in this format:

## Sprint Tasks for Epic X

| US | Title | Dependencies | Complexity |
|----|-------|--------------|------------|
| US-X.1 | ... | None | S/M/L |
| US-X.2 | ... | US-X.1 | S/M/L |

## Dependency Graph
```
US-X.1 --> US-X.2 --> US-X.3
              \--> US-X.4
```

Wait for my approval before starting any work.
Once approved, we'll implement one US at a time using `/implement-us`.
