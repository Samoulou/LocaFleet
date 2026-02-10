# 18. Sécurité & Compliance

> Stratégie de sécurité production-ready pour une application SaaS multi-tenant qui gère des données personnelles sensibles (permis de conduire, adresses, données financières).

---

## 1. Vue d'ensemble des risques

| Risque | Gravité | Probabilité | Surface d'attaque |
|--------|---------|-------------|-------------------|
| Fuite de données cross-tenant | 🔴 Critique | Moyenne | Server Actions sans tenantId |
| Injection SQL | 🔴 Critique | Faible | Drizzle ORM protège, sauf raw SQL |
| XSS (cross-site scripting) | 🟡 Haute | Moyenne | Inputs utilisateur non-sanitized |
| CSRF | 🟡 Haute | Moyenne | Server Actions sans validation origin |
| Brute force login | 🟡 Haute | Haute | Pas de rate limiting |
| Accès fichiers non autorisé | 🟡 Haute | Moyenne | URLs Supabase Storage prévisibles |
| Non-conformité nLPD | 🔴 Critique | Certaine | Données personnelles sans politique |

---

## 2. Sécurité applicative

### 2.1 Rate Limiting

**Pourquoi :** Sans rate limiting, un attaquant peut brute-forcer les mots de passe, spammer la création de contrats, ou DDoS les Server Actions.

**Implémentation : middleware Hono + upstash/ratelimit**

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Pour les routes API (Hono)
export const apiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, "1 m"), // 60 req/min
  analytics: true,
});

// Pour le login (plus strict)
export const authLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 tentatives/15min
  analytics: true,
});

// Pour les Server Actions (mutations)
export const actionLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 m"), // 30 mutations/min
  analytics: true,
});
```

**Alternative sans Redis (si budget serré) :** rate limiting en mémoire avec `next-rate-limit` — moins robuste (reset au redémarrage Railway) mais suffisant en V1 mono-instance.

```typescript
// src/lib/rate-limit-memory.ts
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
```

**Où l'appliquer :**

| Route/Action | Limite | Clé |
|---|---|---|
| POST `/api/auth/login` | 5 / 15 min | IP |
| POST `/api/auth/reset-password` | 3 / 1h | IP + email |
| Server Actions (toutes mutations) | 30 / min | userId |
| GET `/api/*` | 60 / min | IP |
| Hono PDF generation | 10 / min | userId |
| Hono email sending | 20 / min | tenantId |

### 2.2 Security Headers

**Middleware Next.js (`next.config.ts`) :**

```typescript
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval pour Next.js dev
      "style-src 'self' 'unsafe-inline'", // Tailwind inline styles
      "img-src 'self' blob: data: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

// next.config.ts
const nextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

### 2.3 CSRF Protection

Next.js Server Actions ont une protection CSRF intégrée (vérification de l'header `Origin`). Mais pour les routes Hono, il faut l'ajouter manuellement :

```typescript
// src/app/api/[[...route]]/route.ts
import { csrf } from "hono/csrf";

const app = new Hono();
app.use("*", csrf({ origin: process.env.NEXT_PUBLIC_APP_URL }));
```

### 2.4 Input Sanitization

Zod valide la structure, mais ne sanitize pas le contenu HTML. Pour les champs texte libre (notes, descriptions) :

```typescript
// src/lib/sanitize.ts
import DOMPurify from "isomorphic-dompurify";

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }); // Strip ALL HTML
}

// Dans les Server Actions, avant d'insérer en DB :
const sanitizedNotes = sanitizeInput(parsed.data.notes);
```

### 2.5 Signed URLs pour le Storage

Les photos de véhicules et d'inspections ne doivent **jamais** être accessibles via une URL publique prévisible.

```typescript
// src/lib/storage.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn); // URL expire après 1h
  if (error) throw error;
  return data.signedUrl;
}
```

**Configuration Supabase Storage :**
- Bucket `vehicle-photos` : **privé**, politique RLS par tenantId
- Bucket `inspection-photos` : **privé**, politique RLS par tenantId
- Bucket `client-documents` : **privé**, politique RLS par tenantId
- Taille max par fichier : 10 MB
- Types acceptés : `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

---

## 3. Sécurité base de données

### 3.1 Row Level Security (RLS)

Déjà prévu dans `4-technical-assumptions.md`. Voici l'implémentation concrète pour **toutes** les tables :

```sql
-- Activer RLS sur chaque table métier
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- ... (toutes les tables avec tenant_id)

-- Policy template (à appliquer sur chaque table)
CREATE POLICY "tenant_isolation_select" ON vehicles
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "tenant_isolation_insert" ON vehicles
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "tenant_isolation_update" ON vehicles
  FOR UPDATE USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "tenant_isolation_delete" ON vehicles
  FOR DELETE USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Injection du tenant_id dans chaque connexion :**

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export async function getDbForTenant(tenantId: string) {
  const client = postgres(process.env.DATABASE_URL!);
  // Set tenant context for RLS
  await client`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
  return drizzle(client);
}
```

**Double protection :** RLS au niveau PostgreSQL (filet de sécurité) + filtrage tenantId dans Drizzle queries (performance, intentionnel). Si un développeur oublie le WHERE, RLS bloque quand même.

### 3.2 Migrations versionnées (production)

`drizzle-kit push` est parfait pour le dev. En production, il faut des migrations versionnées et auditables.

```typescript
// drizzle.config.ts — changer pour la prod
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations", // migrations versionnées
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
});
```

**Workflow migrations :**
```bash
# Développement : modifier schema.ts puis générer la migration
npx drizzle-kit generate    # Génère un fichier SQL versionné dans drizzle/migrations/

# Review la migration SQL AVANT de l'appliquer
cat drizzle/migrations/0001_*.sql

# Appliquer en staging
npx drizzle-kit migrate

# Appliquer en production (via CI/CD)
npx drizzle-kit migrate
```

**Règles critiques :**
- **Jamais** de `drizzle-kit push` en production
- Chaque migration est commitée dans Git (traçabilité)
- Les migrations destructives (DROP COLUMN, etc.) nécessitent un backup d'abord
- En CI/CD, la migration tourne avant le déploiement de l'app

**Script CI :**
```yaml
# Dans .github/workflows/ci.yml, job deploy
- run: npx drizzle-kit migrate
  env:
    DIRECT_URL: ${{ secrets.PRODUCTION_DIRECT_URL }}
- run: railway deploy
```

### 3.3 Backup Strategy

Supabase Pro fait des backups automatiques quotidiens. Mais pour de la vraie prod :

| Backup | Fréquence | Rétention | Méthode |
|--------|-----------|-----------|---------|
| Auto Supabase | Quotidien | 7 jours (free) / 30 jours (pro) | Snapshot Supabase |
| Export manuel | Hebdomadaire | 90 jours | `pg_dump` via cron |
| Avant migration | À chaque deploy | 30 jours | `pg_dump` dans CI/CD |

**Script de backup pré-deploy :**
```bash
#!/bin/bash
# scripts/backup-before-deploy.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump $DIRECT_URL --format=custom --file="backups/pre-deploy-$TIMESTAMP.dump"
echo "Backup created: backups/pre-deploy-$TIMESTAMP.dump"
```

---

## 4. Compliance nLPD (Loi fédérale sur la protection des données)

La nLPD (entrée en vigueur le 1er septembre 2023) est l'équivalent suisse du RGPD. LocaFleet traite des données personnelles sensibles : noms, adresses, emails, numéros de permis de conduire, photos d'identité.

### 4.1 Données personnelles dans LocaFleet

| Donnée | Table | Sensibilité | Base légale |
|--------|-------|-------------|-------------|
| Nom, prénom, email | `clients` | Standard | Exécution du contrat |
| N° de téléphone | `clients` | Standard | Exécution du contrat |
| N° de permis de conduire | `clients` | Élevée | Obligation légale (location véhicule) |
| Photo du permis | `client_documents` | Élevée | Obligation légale |
| Adresse | `clients` | Standard | Exécution du contrat |
| Données de facturation | `invoices`, `payments` | Standard | Obligation légale (comptabilité) |
| Photos d'inspection (avec plaques) | `inspection_photos` | Standard | Intérêt légitime |

### 4.2 Politique de rétention

```typescript
// src/lib/constants.ts
export const DATA_RETENTION = {
  // Contrats terminés : conserver 10 ans (obligation comptable suisse)
  contracts: { years: 10, reason: "Obligation comptable (CO art. 958f)" },
  
  // Factures : conserver 10 ans
  invoices: { years: 10, reason: "Obligation comptable (CO art. 958f)" },
  
  // Clients sans contrat actif : supprimer après 3 ans
  inactiveClients: { years: 3, reason: "Pas de base légale après inactivité" },
  
  // Photos d'inspection : supprimer 1 an après fin de contrat
  inspectionPhotos: { years: 1, reason: "Plus nécessaire après règlement" },
  
  // Logs d'audit : conserver 5 ans
  auditLogs: { years: 5, reason: "Traçabilité et conformité" },
  
  // Sessions utilisateur : supprimer après 90 jours
  sessions: { days: 90, reason: "Sécurité" },
};
```

**Job de nettoyage (Hono cron) :**
```typescript
// src/app/api/[[...route]]/cron/data-retention.ts
export async function cleanupExpiredData() {
  const now = new Date();
  
  // Supprimer les photos d'inspection > 1 an après fin de contrat
  const expiredPhotos = await db.query.inspectionPhotos.findMany({
    where: and(
      lt(inspectionPhotos.createdAt, subYears(now, 1)),
      // ... join avec contrats terminés
    ),
  });
  
  for (const photo of expiredPhotos) {
    await supabase.storage.from("inspection-photos").remove([photo.storagePath]);
    await db.delete(inspectionPhotos).where(eq(inspectionPhotos.id, photo.id));
  }
  
  // Log l'opération
  await createAuditLog({
    action: "data_retention_cleanup",
    entityType: "system",
    details: { photosDeleted: expiredPhotos.length },
  });
}
```

### 4.3 Droit d'accès et d'effacement

La nLPD donne aux personnes le droit de :
1. **Accéder** à toutes leurs données personnelles
2. **Rectifier** les données incorrectes
3. **Demander l'effacement** (sauf obligation légale de conservation)

**Fonctionnalité à intégrer dans l'Epic 3 (Clients) :**

```typescript
// Server Action : export des données d'un client (droit d'accès)
export async function exportClientData(clientId: string) {
  const client = await getClientById(clientId);
  const contracts = await getContractsByClient(clientId);
  const invoices = await getInvoicesByClient(clientId);
  const inspections = await getInspectionsByContracts(contracts.map(c => c.id));
  
  return {
    personalData: {
      name: `${client.firstName} ${client.lastName}`,
      email: client.email,
      phone: client.phone,
      address: client.address,
      licenseNumber: client.licenseNumber,
    },
    contracts: contracts.map(c => ({
      id: c.id, startDate: c.startDate, endDate: c.endDate, status: c.status,
    })),
    invoices: invoices.map(i => ({
      id: i.id, amount: i.totalAmount, date: i.issueDate, status: i.status,
    })),
    inspections: inspections.map(i => ({
      id: i.id, type: i.type, date: i.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  };
}
```

### 4.4 Déclaration de traitement

Créer un fichier `docs/data-processing-register.md` qui documente :
- Quelles données sont collectées
- Pourquoi (base légale)
- Combien de temps elles sont conservées
- Qui y a accès (rôles admin/agent/viewer)
- Quels sous-traitants (Supabase, Railway, Resend)

C'est une obligation nLPD pour les entreprises qui traitent des données à grande échelle.

---

## 5. Audit Trail

La table `audit_logs` existe dans le schema mais aucune US ne l'alimente actuellement.

### 5.1 Helper d'audit

```typescript
// src/lib/audit.ts
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getSession } from "@/lib/auth";

type AuditAction = 
  | "create" | "update" | "delete" | "soft_delete"
  | "login" | "logout" | "login_failed"
  | "export_data" | "role_change"
  | "data_retention_cleanup";

export async function audit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  const session = await getSession();
  
  await db.insert(auditLogs).values({
    tenantId: session.tenantId,
    userId: session.userId,
    action,
    entityType,
    entityId,
    details: details ? JSON.stringify(details) : null,
    ipAddress: null, // Extraire du request si disponible
  });
}
```

### 5.2 Où appeler `audit()`

| Action | Quand | Exemple |
|--------|-------|---------|
| `create` | Après chaque insert réussi | `audit("create", "client", newClient.id)` |
| `update` | Après chaque update réussi | `audit("update", "vehicle", vehicleId, { field: "status", old: "available", new: "rented" })` |
| `soft_delete` | Après chaque soft delete | `audit("soft_delete", "client", clientId)` |
| `login` | Après login réussi | `audit("login", "user", userId)` |
| `login_failed` | Après login échoué | `audit("login_failed", "user", email)` |
| `export_data` | Export de données client | `audit("export_data", "client", clientId)` |
| `role_change` | Changement de rôle utilisateur | `audit("role_change", "user", userId, { old: "agent", new: "admin" })` |

---

## 6. User Stories Sécurité

### US-SEC-1: Rate Limiting (Epic 1 — Foundation)

**As a** system administrator
**I want** rate limiting on all public-facing endpoints
**So that** the application is protected against brute force and DDoS attacks

**Acceptance Criteria:**
```gherkin
Given a user tries to login
When they fail 5 times in 15 minutes
Then the login endpoint returns 429 Too Many Requests
And the response includes a Retry-After header

Given an authenticated user
When they make more than 30 mutations per minute
Then subsequent mutations return 429
And a warning is logged
```

**Effort :** 2h | **Priority :** 🔴 Sprint 1

---

### US-SEC-2: Security Headers (Epic 1 — Foundation)

**As a** security engineer
**I want** proper HTTP security headers on all responses
**So that** common web attacks (XSS, clickjacking, MIME sniffing) are mitigated

**Acceptance Criteria:**
```gherkin
Given any page is loaded
When I inspect the response headers
Then I see: HSTS, X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy

Given the CSP policy is active
When a script from an unauthorized domain tries to load
Then it is blocked by the browser
```

**Effort :** 30min | **Priority :** 🔴 Sprint 1

---

### US-SEC-3: RLS Policies Supabase (Epic 1 — Foundation)

**As a** database administrator
**I want** Row Level Security enabled on all tenant-scoped tables
**So that** even direct database access cannot leak cross-tenant data

**Acceptance Criteria:**
```gherkin
Given RLS is enabled on all tables with tenant_id
When a query runs without setting app.tenant_id
Then it returns 0 rows (default deny)

Given a user is authenticated with tenant "A"
When they query the vehicles table
Then they only see vehicles belonging to tenant "A"
```

**Effort :** 1h | **Priority :** 🔴 Sprint 1

---

### US-SEC-4: Audit Trail (Transverse — tous les Epics)

**As a** business owner
**I want** all critical actions logged in an audit trail
**So that** I can trace who did what, when, for compliance and dispute resolution

**Acceptance Criteria:**
```gherkin
Given I create, update, or delete any entity
When the action completes
Then an entry is added to audit_logs with userId, tenantId, action, entityType, entityId, timestamp

Given I view the audit log
When I filter by entity type "contract"
Then I see all actions (create, update, delete) for all contracts, ordered by date
```

**Effort :** 1h setup + ~15min par Epic pour intégrer les appels | **Priority :** 🟡 Sprint 2+

---

### US-SEC-5: Migrations versionnées (Sprint 0 — setup)

**As a** developer
**I want** database migrations tracked in Git
**So that** production schema changes are auditable, reversible, and automated

**Acceptance Criteria:**
```gherkin
Given I modify the Drizzle schema
When I run `npx drizzle-kit generate`
Then a new SQL migration file is created in drizzle/migrations/
And it is committed to Git

Given I deploy to production
When the CI/CD pipeline runs
Then migrations are applied before the app starts
And a backup is taken before the migration
```

**Effort :** 30min | **Priority :** 🔴 Sprint 1 (avant le premier deploy prod)

---

### US-SEC-6: Conformité nLPD (Epic 3 — Clients)

**As a** business owner
**I want** to comply with the Swiss Data Protection Act (nLPD)
**So that** the business is legally protected and clients' rights are respected

**Acceptance Criteria:**
```gherkin
Given a client requests access to their data
When an admin clicks "Export data" on the client profile
Then a JSON/PDF report is generated with all personal data, contracts, invoices

Given a client requests deletion
When an admin processes the request
Then personal data is anonymized (but contracts and invoices are retained for legal reasons)
And an audit log entry is created

Given data retention periods are defined
When the retention cron job runs
Then expired data (photos, inactive clients) is permanently deleted
And a log is created with the number of records deleted
```

**Effort :** 4h | **Priority :** 🟡 Avant go-live

---

## 7. Checklist sécurité pré-production

- [ ] Rate limiting actif sur login, Server Actions, et API Hono
- [ ] Security headers configurés dans next.config.ts
- [ ] CSP policy testée (pas de ressources bloquées légitimement)
- [ ] RLS activé sur toutes les tables avec tenant_id
- [ ] Migrations versionnées (plus de `drizzle-kit push` en prod)
- [ ] Backup pré-deploy automatisé
- [ ] Audit trail actif sur les actions critiques
- [ ] Input sanitization sur les champs texte libre
- [ ] Signed URLs pour tous les fichiers Supabase Storage
- [ ] Politique de rétention documentée
- [ ] Data processing register créé (docs/data-processing-register.md)
- [ ] Fonction export données client implémentée
- [ ] CSRF protection sur les routes Hono
- [ ] `isomorphic-dompurify` ajouté aux dépendances
- [ ] Pas de secrets dans le code (vérifier avec `grep -r "sk_\|pk_\|password" src/`)
