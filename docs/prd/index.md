# LocaFleet — Product Requirements Document (PRD)

> **Version:** 2.0.0
> **Last updated:** 2026-02-13
> **Author:** Sam
> **Status:** MVP in progress

---

## Table of Contents

### Fondation

| # | Document | Description |
|---|----------|-------------|
| 1 | [Goals & Background Context](./1-goals-and-background-context.md) | Vision, problem statement, target users, success metrics |
| 2 | [Requirements](./2-requirements.md) | Functional & non-functional requirements |
| 3 | [User Interface Design Goals](./3-user-interface-design-goals.md) | UI/UX principles, layout, design system |
| 4 | [Technical Assumptions](./4-technical-assumptions.md) | Stack, architecture, infrastructure decisions |

### MVP — Source de verite

| # | Document | Description |
|---|----------|-------------|
| 5 | [Epic List & Avancement](./5-epic-list.md) | Vue d'ensemble des phases, avancement, scope MVP |
| 23 | [**MVP Workflow — Flux Location Complet**](./23-mvp-workflow.md) | **User Stories MVP (Sprint 3-5), schema changes, routes** |

### Guides techniques

| # | Document | Description |
|---|----------|-------------|
| 12 | [Checklist & Results Report](./12-checklist-results-report.md) | PRD quality checklist |
| 13 | [Next Steps](./13-next-steps.md) | Roadmap, post-MVP, V2 considerations |
| 14 | [Claude Code Setup Guide](./14-claude-code-setup-guide.md) | Skills, orchestrateur, CLAUDE.md, best practices |
| 15 | [Strategie de Tests](./15-testing-strategy.md) | Vitest (unit), Playwright (E2E), patterns, CI/CD |
| 16 | [Workflow Dev d'une US](./16-workflow-developpement-us.md) | Etape par etape du premier prompt au push |
| 17 | [Orchestration Avancee](./17-claude-code-advanced-orchestration.md) | Subagents, Tasks, hooks, compound engineering |
| 18 | [Securite & Compliance](./18-security-compliance.md) | Rate limiting, RLS, nLPD, audit trail, headers |
| 19 | [Performance & Scalabilite](./19-performance-scalability.md) | Caching, pagination, storage, compression |
| 20 | [Operations & Observabilite](./20-ops-observability.md) | Logging structure, health check, metriques |
| 21 | [Navigation PRD pour Claude](./21-prd-navigation-strategy.md) | 3 couches de context, routing table |
| 22 | [Flow de Developpement](./22-development-flow-summary.md) | Le one-pager a garder ouvert pendant le dev |

### Ressources

| # | Document | Description |
|---|----------|-------------|
| — | [Schema Drizzle](./schema.ts) | Schema complet de la base de donnees (21 tables) |
| — | [Change Log](./change-log.md) | Version history |
| — | [Prompt Maquettes](./prompt-maquettes-locafleet.md) | Prompts pour la generation de maquettes UI |
| — | [Railway Setup](./railway-setup.md) | Guide de deploiement Railway |
