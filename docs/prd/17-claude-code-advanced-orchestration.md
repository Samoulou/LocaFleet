# 17. Claude Code — Orchestration Avancée

> Recommandations pour passer du niveau "bon setup" au niveau "pointe de l'état de l'art". Basé sur les pratiques des power users, du créateur de Claude Code (Boris Cherny), et des dernières features (Tasks, Agent Teams, Subagents, Hooks avancés).

---

## 1. Repenser la stratégie de Hooks

### Le problème avec notre setup actuel

Notre hook PostToolUse lance `tsc --noEmit` après **chaque** modification de fichier. C'est le pattern "block-at-write" — et c'est un anti-pattern selon les power users.

**Pourquoi c'est un problème :**
- Claude est en train de coder 7 fichiers. Après le fichier 3, `tsc` échoue parce que le fichier 4 (qui contient le type manquant) n'existe pas encore.
- Claude se "frustre", tente de fixer une erreur qui n'en est pas une, et perd du contexte.
- Sur un plan de 10 fichiers, ça génère 10 appels tsc dont 7 sont des faux négatifs.

### Le pattern recommandé : Block-at-Commit

L'idée vient de Shrivu Shankar (ingénieur qui utilise Claude Code en production dans un monorepo entreprise) : **laisser Claude finir son plan, puis valider le résultat final au moment du commit.**

**Nouveau `.claude/settings.json` :**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(git commit)",
        "command": "test -f /tmp/locafleet-pre-commit-pass || (echo 'BLOCK: Run npm run check first. Tests must pass before committing.' && exit 1)"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx prettier --write $CLAUDE_FILE_PATH 2>/dev/null || true"
      }
    ],
    "Stop": [
      {
        "command": "echo '⚡ Reminder: run npm run check before committing.'"
      }
    ]
  }
}
```

**Ce qui change :**

| Avant (block-at-write) | Après (block-at-commit) |
|------------------------|------------------------|
| `tsc --noEmit` après chaque fichier | Prettier (non-bloquant) après chaque fichier |
| Claude bloqué 10x par session | Claude code sans interruption |
| Faux négatifs fréquents | Validation complète à la fin |
| Hook bloquant = Claude confus | Hook non-bloquant = Claude fluide |

**Le workflow devient :**
1. Claude code librement (Prettier auto-format chaque fichier, jamais bloquant)
2. Claude finit son plan
3. Il lance `npm run check` (tsc + lint + tests)
4. Si tout passe → il crée `/tmp/locafleet-pre-commit-pass`
5. Il `git commit` → le hook PreToolUse vérifie le fichier → commit autorisé ✅
6. Si check échoue → Claude fixe, relance check, boucle jusqu'à vert

**Script `scripts/pre-commit-check.sh` :**
```bash
#!/bin/bash
rm -f /tmp/locafleet-pre-commit-pass
npm run check
if [ $? -eq 0 ]; then
  touch /tmp/locafleet-pre-commit-pass
  echo "✅ All checks passed. You can now commit."
else
  echo "❌ Checks failed. Fix errors before committing."
  exit 1
fi
```

---

## 2. Ajouter des Subagents (`.claude/agents/`)

Les subagents sont des instances Claude spécialisées avec leur propre prompt système, leur propre contexte, et optionnellement un modèle différent (Haiku pour les tâches simples = moins cher).

**Différence clé avec les Skills :**
- **Skill** = connaissances injectées dans le contexte principal de Claude
- **Subagent** = instance séparée avec son propre contexte, qui retourne un résumé

### Subagents recommandés pour LocaFleet

**`.claude/agents/security-reviewer.md`**
```markdown
---
name: security-reviewer
description: Reviews code for security vulnerabilities, especially tenantId leaks, SQL injection, and auth bypass
tools: Read, Grep, Glob
model: sonnet
---

You are a senior security engineer reviewing a multi-tenant SaaS application.

## Critical checks:
1. **Tenant isolation**: Every database query MUST filter by tenantId. Flag any query without it.
2. **Auth checks**: Every Server Action that mutates data must verify the user's role (admin/agent).
3. **Input validation**: All user inputs must pass through Zod schemas before reaching the database.
4. **SQL injection**: Check for raw SQL or string concatenation in queries.
5. **Secrets exposure**: No API keys, passwords, or tokens in code.
6. **XSS**: No dangerouslySetInnerHTML or unescaped user content.

Provide specific file:line references and severity (CRITICAL/HIGH/MEDIUM/LOW).
```

**`.claude/agents/test-writer.md`**
```markdown
---
name: test-writer
description: Writes unit tests for Server Actions and Zod schemas following LocaFleet testing conventions
tools: Read, Write, Edit, Bash, Glob
model: sonnet
---

You are a test engineer for a Next.js application using Vitest and React Testing Library.

## Conventions:
- Tests co-located: `entity.actions.test.ts` next to `entity.actions.ts`
- Mock DB with `vi.mock("@/db")`
- Mock auth with `vi.mock("@/lib/auth")` returning `{ tenantId: "test-tenant", role: "admin" }`
- Every Server Action needs 3 tests minimum: happy path, auth rejection, Zod validation rejection
- Every Zod schema needs: valid input, each invalid field, edge cases
- Use `describe/it` blocks, French test names are OK
- Run `npx vitest run` on your tests before reporting back
```

**`.claude/agents/db-analyst.md`**
```markdown
---
name: db-analyst
description: Analyzes database queries for performance, missing indexes, and N+1 problems
tools: Read, Grep, Glob, Bash
model: haiku
---

You are a PostgreSQL performance analyst. Review Drizzle ORM queries for:

1. **N+1 queries**: Loops that execute individual queries instead of batch/join
2. **Missing indexes**: Columns used in WHERE/ORDER BY without indexes in schema.ts
3. **Unnecessary data**: SELECT * when only a few columns are needed
4. **Tenant filtering**: Every query must include .where(eq(table.tenantId, tenantId))
5. **Soft delete**: Queries should exclude deleted records (.where(isNull(table.deletedAt)))

Reference the schema at src/db/schema.ts for index verification.
```

### Comment Claude les utilise

Tu n'as pas besoin de les invoquer manuellement. Claude lit les `description` et décide automatiquement quand les utiliser. Mais tu peux aussi forcer :

```
Utilise le subagent security-reviewer pour analyser les changements de ce PR.
```

Ou dans un slash command :

```markdown
# .claude/commands/review.md
Review the current git diff. Use the security-reviewer subagent for security analysis
and the db-analyst subagent for query performance. Report findings.
```

---

## 3. Le système Tasks — État persistant entre sessions

Les Tasks sont la feature la plus récente et la plus puissante. Contrairement aux Todos (qui sont volatils), les Tasks persistent sur le filesystem dans `~/.claude/tasks/` et supportent les dépendances (DAG).

### Pourquoi c'est un game-changer

Quand tu fais `/clear`, les Tasks **survivent**. Claude peut reprendre là où il s'est arrêté dans la session suivante. C'est la solution au problème #1 de Claude Code : la perte de contexte.

### Intégration dans le workflow LocaFleet

**Nouveau slash command `.claude/commands/sprint.md` :**
```markdown
# Sprint Planning

Read the Epic file at docs/prd/$ARGUMENTS.

For each User Story in this Epic, create a Task with:
- Title: US number + short description
- Description: the acceptance criteria from the PRD
- Dependencies: which US must be completed before this one

Then show me the task list and wait for my approval before starting any work.
```

**Usage :**
```
/sprint 23-mvp-workflow
```

**Ce qui se passe :**
1. Claude lit l'Epic 3
2. Il crée un task list avec US-3.1, US-3.2, US-3.3, US-3.4
3. US-3.2 (wizard contrats) dépend de US-3.1 (CRUD clients) — marqué comme bloqué
4. Tu `/clear` après US-3.1, et dans la nouvelle session Claude voit que US-3.1 est "completed" et que US-3.2 est maintenant débloqué

**Variable d'environnement pour partager l'état :**
```bash
export CLAUDE_CODE_TASK_LIST_ID="locafleet-sprint-3"
```

Tous les terminaux Claude pointant vers ce task list voient le même état.

---

## 4. Parallélisation avec Task()

Pour les tâches lourdes, Claude peut spawner des sous-tâches parallèles. Chaque sous-tâche a son propre contexte window de 200k tokens.

### Cas d'usage LocaFleet

**Exploration du codebase au début d'un Epic :**
```
Avant de commencer l'Epic 4, explore le codebase en parallèle avec 4 tâches :
- Tâche 1 : Lis tous les composants dans src/components/ et liste les patterns UI utilisés
- Tâche 2 : Lis toutes les Server Actions dans src/actions/ et vérifie le pattern tenantId
- Tâche 3 : Lis le schema.ts et identifie les tables pertinentes pour l'Epic 4
- Tâche 4 : Lis tous les tests existants et identifie les gaps de couverture
```

Claude spawn 4 instances, chacune explore indépendamment, et te retourne un résumé consolidé. Ton contexte principal reste propre.

**Ctrl+B** : Si un subagent prend du temps, appuie sur `Ctrl+B` pour le passer en arrière-plan et continuer à travailler avec Claude sur autre chose.

---

## 5. Compound Engineering — L'amélioration continue

C'est le pattern le plus important de tous, et il vient directement de l'équipe qui a créé Claude Code.

### Le principe

> Chaque erreur de Claude est une opportunité d'améliorer le CLAUDE.md.

Quand Claude fait une erreur récurrente, au lieu de la corriger et passer à autre chose, **tu ajoutes une règle dans CLAUDE.md** pour que ça n'arrive plus jamais. Le coût de l'erreur ne se paie qu'une fois. Le bénéfice est permanent.

### Le flywheel

```
Erreur détectée → Correction → Ajout règle CLAUDE.md → Commit → Toutes les futures sessions bénéficient
```

### En pratique

Après chaque session, demande-toi :
- Claude a-t-il oublié le tenantId quelque part ? → Ajouter : `# CRITICAL: NEVER query without tenantId filter`
- Claude a-t-il utilisé `react-big-calendar` au lieu de `planby` ? → Ajouter : `# FORBIDDEN: react-big-calendar (use planby)`
- Claude a-t-il formaté les prix sans apostrophe ? → Ajouter : `# Swiss formatting: 1'250.00 CHF (apostrophe thousands separator)`

### Automatiser le flywheel

Tu peux aller plus loin avec l'analyse des logs de session :

```bash
# Analyser les sessions récentes pour trouver les patterns d'erreurs
claude --resume <session-id> -p "Résume les erreurs que tu as faites dans cette session et propose des ajouts à CLAUDE.md pour les prévenir"
```

Ou le pattern du créateur de Claude Code (Boris Cherny) : **tagger @claude sur les PRs des collègues** pour que Claude propose des mises à jour du CLAUDE.md en tant que partie de la code review.

---

## 6. Architecture CLAUDE.md multi-niveaux

Au lieu d'un seul CLAUDE.md de 150 lignes (qui risque de devenir trop long), utiliser une hiérarchie :

```
locafleet/
├── CLAUDE.md                          # Racine : stack, commandes, règles critiques (< 80 lignes)
├── src/
│   ├── CLAUDE.md                      # Conventions code : TypeScript, Server Components, imports
│   ├── actions/
│   │   └── CLAUDE.md                  # Pattern Server Actions, tenantId, auth, error handling
│   ├── components/
│   │   └── CLAUDE.md                  # Composants shadcn/ui, patterns forms, 'use client'
│   └── db/
│       └── CLAUDE.md                  # Drizzle patterns, migrations, connexion poolée
├── e2e/
│   └── CLAUDE.md                      # Conventions Playwright, auth.setup, helpers
└── docs/
    └── CLAUDE.md                      # Comment naviguer le PRD, structure des Epics
```

**Comment ça marche :** Claude charge automatiquement **tous** les CLAUDE.md qui sont ancêtres du fichier qu'il est en train de modifier. S'il modifie `src/actions/client.actions.ts`, il charge :
1. `CLAUDE.md` (racine)
2. `src/CLAUDE.md`
3. `src/actions/CLAUDE.md`

C'est du "context engineering progressif" — les règles les plus spécifiques sont chargées seulement quand elles sont pertinentes.

### Exemple `src/actions/CLAUDE.md`

```markdown
# Server Actions conventions

## Pattern obligatoire pour chaque action :
1. Vérifier l'auth : `const session = await getSession()`
2. Vérifier le rôle : si mutation, exiger admin ou agent
3. Valider l'input avec Zod : `const parsed = schema.safeParse(input)`
4. Filtrer par tenantId : TOUJOURS `.where(eq(table.tenantId, session.tenantId))`
5. Soft delete : JAMAIS de `.delete()`, toujours `.update({ deletedAt: new Date() })`
6. Revalidate : `revalidatePath()` après chaque mutation
7. Return : `{ success: true, data }` ou `{ success: false, error: "message" }`

## Anti-patterns :
- ❌ `db.delete(table).where(...)` → utiliser soft delete
- ❌ Oublier tenantId dans un WHERE
- ❌ Retourner l'objet Drizzle directement (exposer les colonnes internes)
```

---

## 7. PreToolUse Hooks — Modification transparente des inputs

Feature peu connue mais puissante (v2.0.10+) : les hooks PreToolUse peuvent **modifier** l'input d'un outil avant son exécution, de manière invisible pour Claude.

### Cas d'usage : forcer le dry-run sur les commandes dangereuses

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(drizzle-kit)",
        "command": "echo 'Adding --dry-run flag for safety' && echo '{\"command\": \"'$TOOL_INPUT' --dry-run\"}'"
      }
    ]
  }
}
```

### Cas d'usage : auto-inject des secrets d'environnement

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash(npm run e2e)",
        "command": "export TEST_ADMIN_PASSWORD=$(cat .env.test | grep TEST_ADMIN_PASSWORD | cut -d= -f2)"
      }
    ]
  }
}
```

---

## 8. Plugins et Marketplaces à considérer

### Tier 1 — À installer absolument

| Plugin | Source | Pourquoi |
|--------|--------|----------|
| `compound-engineering` | EveryInc | Transforme les erreurs en leçons CLAUDE.md, pattern build/validate |
| `context-engineering-kit` | Vlad Goncharov | Techniques d'optimisation de contexte à faible empreinte token |
| `postgres-best-practices` | supabase/agent-skills | Patterns PostgreSQL pour Drizzle |

### Tier 2 — À évaluer

| Plugin | Source | Pourquoi |
|--------|--------|----------|
| `code-review-ai` | wshobson/agents | Code review multi-facettes (sécurité, performance, simplicité) |
| `engineering-workflow-plugin` | mhattingpete | Git workflow, TDD, code review |

### Ce qu'il NE faut PAS installer

Éviter les mega-plugins avec 100+ agents/skills (comme `claude-flow` ou le repo `wshobson/agents` complet). Ils consomment le budget de description des skills (2% du context window = ~16k chars). Si tu dépasses, des skills sont **silencieusement exclus**. Vérifie avec `/context`.

---

## 9. GitHub Actions — Le PR-from-anywhere

Le Claude Code GitHub Action permet de déclencher un PR automatiquement depuis n'importe où (Slack, Jira, ou même un cron).

### Pour LocaFleet — Auto-review des PRs

**`.github/workflows/claude-pr-review.yml`**
```yaml
name: Claude PR Review
on:
  pull_request:
    branches: [develop, main]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          prompt: |
            Review this PR for:
            1. tenantId filtering on all DB queries
            2. Zod validation on all Server Actions
            3. Test coverage for new actions and schemas
            4. Swiss formatting (CHF with apostrophe, dates DD.MM.YYYY)
            5. No hardcoded strings (i18n keys used)
            Report as PR comments with file:line references.
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Pour plus tard** — auto-fix des bugs :
```yaml
# Triggered from Sentry alert webhook
- uses: anthropics/claude-code-action@v1
  with:
    prompt: |
      Fix the bug described in this Sentry alert:
      ${{ github.event.body }}
      Create a PR with the fix and tests.
```

---

## 10. Session Management avancé

### /compact au lieu de /clear

`/clear` efface tout. `/compact` conserve un résumé structuré de la session (status, travail complété, discussions, work log) et libère le contexte pour la suite. C'est presque toujours préférable.

### Nommer les sessions

```bash
claude --resume        # Reprendre une session récente
/rename sprint-3-us-3.1  # Nommer la session courante
claude --resume sprint-3-us-3.1  # Reprendre par nom
```

### Analyser les sessions passées

```bash
# Résumer une session pour en extraire les leçons
claude --resume <session-id> -p "Quelles erreurs as-tu faites ? Quelles règles devraient être ajoutées au CLAUDE.md ?"
```

---

## 11. Plan d'implémentation — Quoi faire maintenant

### Phase 1 : Améliorations immédiates (Sprint 0)

| Action | Impact | Effort |
|--------|--------|--------|
| ⬜ Remplacer hook PostToolUse `tsc` par Prettier non-bloquant | 🔴 Haut | 10 min |
| ⬜ Ajouter hook PreToolUse block-at-commit | 🔴 Haut | 15 min |
| ⬜ Créer le script `scripts/pre-commit-check.sh` | 🔴 Haut | 5 min |
| ⬜ Créer CLAUDE.md multi-niveaux (racine + src/ + src/actions/) | 🟡 Moyen | 20 min |
| ⬜ Créer le subagent `security-reviewer` | 🟡 Moyen | 10 min |
| ⬜ Créer le subagent `test-writer` | 🟡 Moyen | 10 min |
| ⬜ Installer `compound-engineering` plugin | 🟡 Moyen | 5 min |
| ⬜ Mettre à jour le `/review` command pour utiliser les subagents | 🟡 Moyen | 10 min |

### Phase 2 : Après quelques US terminées (Sprint 1-2)

| Action | Impact | Effort |
|--------|--------|--------|
| ⬜ Créer le `/sprint` command avec Tasks | 🟡 Moyen | 20 min |
| ⬜ Créer le subagent `db-analyst` | 🟢 Bas | 10 min |
| ⬜ Setup Claude PR Review GitHub Action | 🟡 Moyen | 30 min |
| ⬜ Premier audit `/context` pour vérifier le budget skills | 🟡 Moyen | 5 min |
| ⬜ Premier cycle Compound Engineering (analyser 3 sessions) | 🔴 Haut | 30 min |

### Phase 3 : Quand le projet grossit (Sprint 3+)

| Action | Impact | Effort |
|--------|--------|--------|
| ⬜ Expérimenter Agent Teams pour les code reviews multi-facettes | 🟢 Bas | 1h |
| ⬜ Parallélisation Task() pour l'exploration cross-Epic | 🟢 Bas | 30 min |
| ⬜ Auto-fix Sentry → PR via GitHub Action | 🟢 Bas | 1h |
| ⬜ Meta-agent (agent qui crée des agents) si besoin de scale | 🟢 Bas | 30 min |

---

## Résumé — Ce qui change dans le setup initial

| Élément | Setup actuel (doc 14) | Setup recommandé (doc 17) |
|---------|----------------------|--------------------------|
| Hook type-check | PostToolUse `tsc` (bloquant) | PostToolUse Prettier (non-bloquant) + PreToolUse block-at-commit |
| CLAUDE.md | 1 fichier racine (~150 lignes) | Multi-niveaux (racine + sous-dossiers) |
| Subagents | Aucun | 3 agents : security-reviewer, test-writer, db-analyst |
| Tasks | Non utilisé | `/sprint` command avec task list persistante |
| Context management | `/clear` (reset total) | `/compact` (résumé préservé) |
| Code review | `/review` (self-review dans le contexte principal) | `/review` avec subagents spécialisés (contexte séparé) |
| Amélioration continue | Manuelle | Compound Engineering (flywheel systématique) |
| CI/CD | GitHub Actions (tests) | + Claude PR Review Action |
| Parallélisation | Non utilisé | Task() pour exploration, Ctrl+B pour background |

**Principe directeur :** Les skills donnent à Claude les **connaissances**. Les subagents lui donnent des **spécialistes**. Les hooks lui donnent des **garde-fous**. Les tasks lui donnent la **mémoire**. Le compound engineering lui donne l'**apprentissage**.
