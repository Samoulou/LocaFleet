# 20. Opérations & Observabilité

> Tout ce qu'il faut pour que l'app tourne en production sans surprises : logging structuré, health checks, métriques business, rollback strategy, export de données, et onboarding.

---

## 1. Logging structuré

### 1.1 Le problème

`console.log("Contrat créé")` ne sert à rien en production. Tu ne sais pas quel contrat, par quel utilisateur, pour quel tenant, ni quand exactement. Quand un client appelle en disant "ma facture est fausse", tu n'as aucun moyen de retracer ce qui s'est passé.

### 1.2 Solution : pino

`pino` est le logger Node.js le plus rapide. Il produit du JSON structuré, compatible avec Railway logs, Sentry, et n'importe quel outil d'analyse.

```typescript
// src/lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  ...(process.env.NODE_ENV === "development" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  }),
});

// Logger contextualisé pour les Server Actions
export function createActionLogger(actionName: string, tenantId: string, userId: string) {
  return logger.child({ action: actionName, tenantId, userId });
}
```

### 1.3 Où logger

```typescript
// src/actions/contract.actions.ts
export async function createContract(data: ContractFormData) {
  const session = await getSession();
  const log = createActionLogger("createContract", session.tenantId, session.userId);

  const parsed = contractSchema.safeParse(data);
  if (!parsed.success) {
    log.warn({ errors: parsed.error.flatten() }, "Validation failed");
    return { success: false, error: "Données invalides" };
  }

  try {
    const contract = await db.insert(rentalContracts).values({
      ...parsed.data,
      tenantId: session.tenantId,
    }).returning();

    log.info(
      { contractId: contract[0].id, clientId: parsed.data.clientId, vehicleId: parsed.data.vehicleId },
      "Contract created"
    );

    revalidateTag(`contracts-${session.tenantId}`);
    return { success: true, data: contract[0] };
  } catch (error) {
    log.error({ error, data: parsed.data }, "Failed to create contract");
    throw error; // Laisser Sentry capturer
  }
}
```

**Niveaux de log :**

| Niveau | Usage | Exemple |
|--------|-------|---------|
| `error` | Erreurs inattendues qui nécessitent une action | DB connection failed, Resend API down |
| `warn` | Situations anormales mais gérées | Validation failed, rate limit reached |
| `info` | Actions métier importantes | Contract created, invoice paid, user logged in |
| `debug` | Détails techniques pour le debugging | Query executed in 45ms, cache hit/miss |

### 1.4 Log dans Railway

Railway collecte automatiquement les logs stdout. Avec pino en JSON, tu peux filtrer dans le Railway dashboard :

```
# Trouver tous les contrats créés hier
{"action":"createContract"} after:2026-02-07

# Trouver toutes les erreurs d'un tenant
{"tenantId":"abc-123","level":"error"}
```

**Dépendances :**
```bash
npm install pino
npm install -D pino-pretty  # Pour le dev uniquement
```

---

## 2. Health Check Endpoint

### 2.1 Pourquoi

Railway (et n'importe quel orchestrateur) a besoin de savoir si l'app est "healthy". Sans health check, Railway ne sait pas si un deploy est réussi ou si l'app a crashé silencieusement.

### 2.2 Implémentation

```typescript
// src/app/api/health/route.ts
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic"; // Jamais cacher

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let healthy = true;

  // Check 1 : Base de données
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch {
    checks.database = "error";
    healthy = false;
  }

  // Check 2 : Supabase Storage
  try {
    const { error } = await supabase.storage.listBuckets();
    checks.storage = error ? "error" : "ok";
    if (error) healthy = false;
  } catch {
    checks.storage = "error";
    healthy = false;
  }

  return Response.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.GIT_SHA || "unknown",
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}
```

### 2.3 Configuration Railway

```toml
# railway.toml
[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 10
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

---

## 3. Métriques Business

### 3.1 Dashboard KPIs

Le dashboard admin doit afficher des métriques business exploitables, pas juste des compteurs.

```typescript
// src/actions/metrics.queries.ts
export async function getBusinessMetrics(tenantId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    fleetUtilization,
    monthlyRevenue,
    lastMonthRevenue,
    activeContracts,
    overdueInvoices,
    upcomingReturns,
  ] = await Promise.all([
    // Taux d'occupation flotte
    db.execute(sql`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'rented') AS rented,
        COUNT(*) FILTER (WHERE status != 'retired') AS total
      FROM vehicles 
      WHERE tenant_id = ${tenantId} AND deleted_at IS NULL
    `),

    // Revenue ce mois
    db.select({ total: sum(invoices.totalAmount) })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.issueDate, startOfMonth),
        eq(invoices.status, "paid"),
      )),

    // Revenue mois dernier (pour comparaison)
    db.select({ total: sum(invoices.totalAmount) })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.issueDate, startOfLastMonth),
        lt(invoices.issueDate, startOfMonth),
        eq(invoices.status, "paid"),
      )),

    // Contrats actifs
    db.select({ count: count() })
      .from(rentalContracts)
      .where(and(
        eq(rentalContracts.tenantId, tenantId),
        eq(rentalContracts.status, "active"),
      )),

    // Factures en retard
    db.select({ count: count(), total: sum(invoices.totalAmount) })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, "sent"),
        lt(invoices.dueDate, now),
      )),

    // Retours dans les 48h
    db.select({ count: count() })
      .from(rentalContracts)
      .where(and(
        eq(rentalContracts.tenantId, tenantId),
        eq(rentalContracts.status, "active"),
        lte(rentalContracts.endDate, addDays(now, 2)),
      )),
  ]);

  return {
    fleetUtilization: {
      rented: fleetUtilization[0].rented,
      total: fleetUtilization[0].total,
      percentage: Math.round((fleetUtilization[0].rented / fleetUtilization[0].total) * 100),
    },
    revenue: {
      currentMonth: monthlyRevenue[0].total || 0,
      lastMonth: lastMonthRevenue[0].total || 0,
      trend: calculateTrend(monthlyRevenue[0].total, lastMonthRevenue[0].total),
    },
    activeContracts: activeContracts[0].count,
    overdueInvoices: {
      count: overdueInvoices[0].count,
      totalAmount: overdueInvoices[0].total || 0,
    },
    upcomingReturns: upcomingReturns[0].count,
  };
}

function calculateTrend(current: number, previous: number): number {
  if (!previous) return 100;
  return Math.round(((current - previous) / previous) * 100);
}
```

### 3.2 Widgets Dashboard

| Widget | Donnée | Visuel |
|--------|--------|--------|
| Taux d'occupation | `rented / total` | Jauge circulaire (Recharts) |
| Revenue du mois | CHF total + % vs mois dernier | Nombre + flèche trend ↑↓ |
| Contrats actifs | Nombre | Badge compteur |
| Factures en retard | Nombre + montant total | Badge rouge si > 0 |
| Retours dans 48h | Nombre | Badge orange si > 0 |
| Revenue mensuelle (graph) | 12 derniers mois | Graphique barres (Recharts) |

---

## 4. Rollback Strategy

### 4.1 Railway Rollback

Railway supporte le rollback en un clic vers n'importe quel deploy précédent. Mais il faut anticiper les migrations DB.

**Règle d'or :** Les migrations doivent être **backward-compatible**.

| Type de migration | Backward-compatible ? | Stratégie |
|---|---|---|
| Ajouter une colonne nullable | ✅ Oui | OK direct |
| Ajouter une colonne NOT NULL | ❌ Non | Ajouter nullable d'abord, migrer les données, puis contrainte |
| Renommer une colonne | ❌ Non | Ajouter la nouvelle, migrer, supprimer l'ancienne (3 deploys) |
| Supprimer une colonne | ❌ Non | Ne supprimer qu'au deploy suivant (après avoir vérifié qu'elle n'est plus utilisée) |
| Ajouter un index | ✅ Oui | Utiliser `CONCURRENTLY` pour éviter le lock |

### 4.2 Procédure de rollback

```
1. Incident détecté (Sentry alert, healthcheck 503, feedback utilisateur)
2. Vérifier si la migration est backward-compatible
   - OUI → Rollback Railway en 1 clic
   - NON → Fix forward (corriger et redéployer)
3. Restaurer le backup si données corrompues
4. Post-mortem : ajouter un test pour éviter la récurrence
```

### 4.3 Script de validation post-deploy

```typescript
// scripts/post-deploy-check.ts
async function postDeployCheck() {
  const checks = [
    // Health check
    fetch(`${process.env.APP_URL}/api/health`).then(r => r.ok),
    // Login fonctionnel
    fetch(`${process.env.APP_URL}/api/auth/session`).then(r => r.status === 401),
    // Page d'accueil
    fetch(`${process.env.APP_URL}/login`).then(r => r.ok),
  ];

  const results = await Promise.allSettled(checks);
  const allPassed = results.every(r => r.status === "fulfilled" && r.value);

  if (!allPassed) {
    console.error("POST-DEPLOY CHECK FAILED", results);
    process.exit(1); // Trigger rollback in CI
  }

  console.log("POST-DEPLOY CHECK PASSED ✅");
}
```

---

## 5. Export de données

### 5.1 Export CSV/Excel

Les utilisateurs voudront exporter les données de toutes les DataTable pour la comptabilité, les rapports, ou l'analyse.

```typescript
// src/lib/export.ts
import * as XLSX from "xlsx";

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; label: string; format?: (v: unknown) => string }[],
  filename: string
) {
  const rows = data.map((row) =>
    Object.fromEntries(
      columns.map((col) => [
        col.label,
        col.format ? col.format(row[col.key]) : row[col.key],
      ])
    )
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export");

  // Auto-size columns
  const colWidths = columns.map((col) => ({
    wch: Math.max(
      col.label.length,
      ...data.map((row) => String(row[col.key] || "").length)
    ),
  }));
  ws["!cols"] = colWidths;

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
```

**Usage côté serveur (Server Action) :**

```typescript
// src/actions/export.actions.ts
"use server";

export async function exportClients() {
  const session = await getSession();
  const clients = await db.query.clients.findMany({
    where: and(eq(clients.tenantId, session.tenantId), isNull(clients.deletedAt)),
  });

  const buffer = exportToExcel(clients, [
    { key: "firstName", label: "Prénom" },
    { key: "lastName", label: "Nom" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Téléphone" },
    { key: "licenseNumber", label: "N° Permis" },
    { key: "createdAt", label: "Créé le", format: (v) => formatDateCH(v as Date) },
  ], "clients");

  return Buffer.from(buffer).toString("base64");
}
```

**Côté client :**

```typescript
// Bouton d'export dans le composant DataTable
async function handleExport() {
  const base64 = await exportClients();
  const blob = new Blob(
    [Uint8Array.from(atob(base64), c => c.charCodeAt(0))],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clients-${formatDateCH(new Date())}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### 5.2 Tables exportables

| Table | Format | Colonnes principales |
|-------|--------|---------------------|
| Clients | XLSX/CSV | Nom, email, tel, permis, date création |
| Véhicules | XLSX/CSV | Marque, modèle, plaque, km, statut, catégorie |
| Contrats | XLSX/CSV | N°, client, véhicule, dates, montant, statut |
| Factures | XLSX/CSV | N°, client, montant, date, statut, date paiement |
| Audit log | CSV | Date, utilisateur, action, entité, détails |

**Dépendance :**
```bash
npm install xlsx
```

---

## 6. Onboarding & Données de démo

### 6.1 Seed enrichi

Le seed de l'US-0.5 crée 3 utilisateurs et quelques véhicules/clients. Pour une vraie démo :

```typescript
// src/db/seed.ts — version enrichie
export async function seedDemoData() {
  // Tenant
  const tenant = await createTenant("LocaFleet Demo", "demo");
  
  // Users (déjà dans US-0.5)
  // ...

  // 5 catégories véhicules
  const categories = await createCategories(tenant.id, [
    { name: "Citadine", dailyRate: 45 },
    { name: "Berline", dailyRate: 75 },
    { name: "SUV", dailyRate: 95 },
    { name: "Utilitaire", dailyRate: 85 },
    { name: "Premium", dailyRate: 150 },
  ]);

  // 15 véhicules (variété de statuts)
  const vehicleData = [
    { brand: "VW", model: "Polo", plate: "VD 123 456", status: "available", category: "Citadine", mileage: 45000 },
    { brand: "Toyota", model: "Yaris", plate: "VD 234 567", status: "available", category: "Citadine", mileage: 32000 },
    { brand: "Skoda", model: "Octavia", plate: "VD 345 678", status: "rented", category: "Berline", mileage: 67000 },
    { brand: "BMW", model: "320d", plate: "VD 456 789", status: "rented", category: "Berline", mileage: 89000 },
    { brand: "Hyundai", model: "Tucson", plate: "VD 567 890", status: "available", category: "SUV", mileage: 28000 },
    { brand: "Dacia", model: "Duster", plate: "VD 678 901", status: "maintenance", category: "SUV", mileage: 55000 },
    { brand: "Renault", model: "Kangoo", plate: "VD 789 012", status: "available", category: "Utilitaire", mileage: 72000 },
    { brand: "Mercedes", model: "Classe C", plate: "VD 890 123", status: "rented", category: "Premium", mileage: 41000 },
    // ... 7 de plus avec mix de statuts
  ];

  // 20 clients
  // 10 contrats (mix actif/terminé/réservé)
  // 5 factures (mix payé/envoyé/en retard)
  // 3 inspections (départ + retour)
}
```

### 6.2 Bouton "Réinitialiser les démos"

Pour l'admin : un bouton qui réexécute le seed en supprimant les données existantes. Utile pour les démos commerciales.

```typescript
// src/actions/admin.actions.ts
export async function resetDemoData() {
  const session = await getSession();
  if (session.role !== "admin") throw new Error("Unauthorized");
  
  // Supprimer toutes les données du tenant (ordre inverse des FK)
  await db.delete(inspectionPhotos).where(eq(inspectionPhotos.tenantId, session.tenantId));
  await db.delete(inspections).where(eq(inspections.tenantId, session.tenantId));
  await db.delete(payments).where(eq(payments.tenantId, session.tenantId));
  await db.delete(invoices).where(eq(invoices.tenantId, session.tenantId));
  await db.delete(rentalContracts).where(eq(rentalContracts.tenantId, session.tenantId));
  await db.delete(clients).where(eq(clients.tenantId, session.tenantId));
  await db.delete(vehicles).where(eq(vehicles.tenantId, session.tenantId));
  
  // Reseed
  await seedDemoData(session.tenantId);
  
  audit("reset_demo", "system", session.tenantId);
  revalidatePath("/");
}
```

---

## 7. Documentation API Hono

Pour les routes Hono (PDF generation, email sending, cron jobs), documenter l'API avec un endpoint de documentation simple.

```typescript
// src/app/api/[[...route]]/docs.ts
export const apiDocs = {
  title: "LocaFleet Internal API",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/health",
      description: "Health check endpoint",
      auth: false,
      response: "{ status, timestamp, version, checks }",
    },
    {
      method: "POST",
      path: "/api/pdf/contract/:id",
      description: "Generate contract PDF",
      auth: true,
      params: { id: "Contract UUID" },
      response: "PDF binary stream",
    },
    {
      method: "POST",
      path: "/api/pdf/invoice/:id",
      description: "Generate invoice PDF",
      auth: true,
      params: { id: "Invoice UUID" },
      response: "PDF binary stream",
    },
    {
      method: "POST",
      path: "/api/email/send",
      description: "Send transactional email via Resend",
      auth: true,
      body: "{ to, template, data }",
      response: "{ success, messageId }",
    },
    {
      method: "POST",
      path: "/api/cron/data-retention",
      description: "Cleanup expired data (nLPD compliance)",
      auth: "cron-secret",
      response: "{ deletedPhotos, deletedSessions }",
    },
  ],
};

// Route pour afficher la doc
app.get("/api/docs", (c) => c.json(apiDocs));
```

---

## 8. User Stories Ops

### US-OPS-1: Logging structuré (Epic 1 — Foundation)

**As a** developer debugging a production issue
**I want** structured JSON logs with context
**So that** I can trace exactly what happened, when, for whom

**Acceptance Criteria:**
```gherkin
Given a Server Action executes
When it logs an event
Then the log includes: level, timestamp, action name, tenantId, userId

Given an error occurs in production
When I search Railway logs
Then I can filter by tenantId and action to isolate the issue
```

**Effort :** 1h | **Priority :** 🔴 Sprint 1

---

### US-OPS-2: Health Check (Epic 1 — Foundation)

**As a** infrastructure engineer
**I want** a health check endpoint that verifies DB and Storage connectivity
**So that** Railway can detect and restart unhealthy instances

**Acceptance Criteria:**
```gherkin
Given the app is running
When GET /api/health is called
Then it returns 200 with { status: "healthy" } if DB and Storage are reachable
Or 503 with { status: "degraded" } if any check fails

Given Railway is configured with healthcheck
When the app crashes silently
Then Railway detects the 503 and restarts the instance
```

**Effort :** 30min | **Priority :** 🔴 Sprint 1

---

### US-OPS-3: Export Excel (Transverse — tous les Epics)

**As a** admin
**I want** to export any DataTable to Excel
**So that** I can share data with my accountant, bank, or insurance

**Acceptance Criteria:**
```gherkin
Given I'm viewing the clients DataTable
When I click the "Exporter" button
Then an .xlsx file downloads with all columns visible in the table
And Swiss formatting is preserved (CHF with apostrophe, dates DD.MM.YYYY)
And the filename includes the date (clients-08.02.2026.xlsx)
```

**Effort :** 2h (helper) + 30min par DataTable | **Priority :** 🟡 Sprint 2+

---

### US-OPS-4: Seed de démo enrichi (Sprint 0)

**As a** developer or sales person
**I want** a realistic demo dataset
**So that** I can test features or demo the app to potential clients

**Acceptance Criteria:**
```gherkin
Given I run the seed script
When it completes
Then the database contains:
  - 3 users (admin, agent, viewer)
  - 5 vehicle categories with daily rates
  - 15 vehicles (mix of statuses)
  - 20 clients with realistic Swiss data
  - 10 contracts (mix active, completed, reserved)
  - 5 invoices (mix paid, sent, overdue)
  - 3 inspections with damage annotations
```

**Effort :** 2h | **Priority :** 🟡 Sprint 1

---

### US-OPS-5: Dashboard Business Metrics (Epic 5)

**As a** business owner
**I want** a dashboard with key performance indicators
**So that** I can monitor fleet utilization, revenue, and overdue payments at a glance

**Acceptance Criteria:**
```gherkin
Given I load the dashboard
When the metrics load
Then I see:
  - Fleet utilization gauge (rented/total in %)
  - Monthly revenue with trend vs last month (↑/↓ %)
  - Active contracts count
  - Overdue invoices count + total amount (red if > 0)
  - Returns in next 48h count (orange if > 0)
  - Monthly revenue bar chart (12 months)
```

**Effort :** 4h | **Priority :** 🟡 Sprint 3 (avec Epic 5)

---

## 9. Checklist ops pré-production

- [ ] `pino` installé et configuré (JSON en prod, pretty en dev)
- [ ] Logger contextualisé utilisé dans toutes les Server Actions
- [ ] `/api/health` endpoint fonctionnel (DB + Storage checks)
- [ ] `railway.toml` configuré avec healthcheckPath
- [ ] Post-deploy check script fonctionnel
- [ ] Export Excel helper créé et testé
- [ ] Export disponible sur au moins les DataTable clients et véhicules
- [ ] Seed de démo enrichi (15 véhicules, 20 clients, 10 contrats)
- [ ] Dashboard KPIs fonctionnels avec requêtes agrégées
- [ ] Migrations backward-compatible documentées dans CLAUDE.md
- [ ] Procédure de rollback documentée et testée
- [ ] API docs endpoint `/api/docs` fonctionnel
- [ ] `xlsx` et `pino` ajoutés aux dépendances du projet
