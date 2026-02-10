# 19. Performance & Scalabilité

> Stratégie pour que l'application reste rapide avec 30-100 véhicules, des centaines de contrats, et des milliers de photos, tout en préparant le scale vers le multi-tenant SaaS.

---

## 1. Stratégie de caching

### 1.1 Next.js Data Cache (Server Components)

Les Server Components de Next.js sont parfaits pour le caching car ils s'exécutent côté serveur et leur résultat peut être mis en cache.

**Stratégie par type de donnée :**

| Donnée | Pattern | TTL | Raison |
|--------|---------|-----|--------|
| Liste véhicules | `unstable_cache` + revalidation on-demand | Jusqu'à mutation | Change rarement, requête fréquente |
| Détail véhicule | `unstable_cache` par ID | Jusqu'à mutation | Consultée souvent par les agents |
| Liste clients | Pas de cache | — | Change souvent, recherche dynamique |
| Dashboard stats | `unstable_cache` | 5 min | Données agrégées, coûteuses à calculer |
| Planning (planby) | `unstable_cache` | 1 min | Requête complexe (jointures), change à chaque contrat |
| Catégories véhicules | `unstable_cache` | 24h | Quasi-statique |
| Tarifs | `unstable_cache` | 1h | Changent rarement |

**Implémentation :**

```typescript
// src/lib/cache.ts
import { unstable_cache } from "next/cache";

// Cache tag-based pour invalidation ciblée
export function cachedQuery<T>(
  queryFn: () => Promise<T>,
  keyParts: string[],
  tags: string[],
  revalidateSeconds?: number
) {
  return unstable_cache(queryFn, keyParts, {
    tags,
    revalidate: revalidateSeconds,
  })();
}

// Exemple d'usage dans une page
export async function getVehicles(tenantId: string) {
  return cachedQuery(
    () => db.query.vehicles.findMany({
      where: and(
        eq(vehicles.tenantId, tenantId),
        isNull(vehicles.deletedAt)
      ),
      with: { category: true, photos: true },
    }),
    ["vehicles", tenantId],
    [`vehicles-${tenantId}`]
  );
}
```

**Invalidation on-demand (dans les Server Actions) :**

```typescript
import { revalidateTag } from "next/cache";

export async function createVehicle(data: VehicleFormData) {
  // ... insert en DB
  revalidateTag(`vehicles-${session.tenantId}`); // Invalide le cache
}
```

### 1.2 React `cache()` pour la déduplication

Dans un même rendu serveur, plusieurs composants peuvent appeler la même query. `cache()` déduplique automatiquement :

```typescript
// src/actions/vehicle.queries.ts
import { cache } from "react";

export const getVehicleById = cache(async (id: string) => {
  return db.query.vehicles.findFirst({
    where: eq(vehicles.id, id),
    with: { category: true, photos: true, maintenanceRecords: true },
  });
});
```

Si la page véhicule et le composant sidebar appellent tous les deux `getVehicleById("abc")`, la requête DB ne s'exécute qu'une seule fois.

---

## 2. Pagination

### 2.1 Offset vs Cursor — Quand utiliser quoi

| Pattern | Avantages | Inconvénients | Usage |
|---------|-----------|---------------|-------|
| **Offset** (`LIMIT/OFFSET`) | Simple, permet "aller à la page 5" | Lent sur grandes tables (scan N lignes) | DataTable avec numéros de pages |
| **Cursor** (`WHERE id > last_id LIMIT N`) | Performant O(1), stable | Pas de "page 5", seulement suivant/précédent | Infinite scroll, API publique |

**Pour LocaFleet V1 : offset** — les DataTable de shadcn/ui utilisent la pagination classique avec numéros de pages, et les tables auront <10k lignes.

**Préparer le cursor pour V2 :** structurer les queries pour qu'elles soient facilement convertibles.

### 2.2 Pattern de pagination standardisé

```typescript
// src/lib/pagination.ts
import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(10).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
```

```typescript
// src/actions/client.actions.ts
export async function getClients(
  params: PaginationParams
): Promise<PaginatedResult<Client>> {
  const { page, perPage, search, sortBy, sortOrder } = params;
  const offset = (page - 1) * perPage;
  const session = await getSession();

  const whereClause = and(
    eq(clients.tenantId, session.tenantId),
    isNull(clients.deletedAt),
    search
      ? or(
          ilike(clients.firstName, `%${search}%`),
          ilike(clients.lastName, `%${search}%`),
          ilike(clients.email, `%${search}%`)
        )
      : undefined
  );

  const [data, countResult] = await Promise.all([
    db.query.clients.findMany({
      where: whereClause,
      limit: perPage,
      offset,
      orderBy: sortBy
        ? sortOrder === "asc" ? asc(clients[sortBy]) : desc(clients[sortBy])
        : desc(clients.createdAt),
    }),
    db.select({ count: count() }).from(clients).where(whereClause),
  ]);

  const total = countResult[0].count;

  return {
    data,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      hasMore: page * perPage < total,
    },
  };
}
```

**Points clés :**
- `Promise.all` pour exécuter data + count en parallèle
- Le count utilise le même `whereClause` pour être cohérent
- `ilike` pour la recherche case-insensitive
- Pas de `SELECT *` — Drizzle sélectionne uniquement les colonnes définies dans le schema

### 2.3 Index pour la recherche

Ajouter un index trigram pour la recherche textuelle performante :

```sql
-- Migration à ajouter
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX clients_search_idx ON clients
  USING gin ((first_name || ' ' || last_name || ' ' || email) gin_trgm_ops);

CREATE INDEX vehicles_plate_search_idx ON vehicles
  USING gin (plate_number gin_trgm_ops);
```

---

## 3. Stockage de fichiers

### 3.1 Architecture Supabase Storage

```
Supabase Storage
├── vehicle-photos/          # Privé, RLS par tenantId
│   └── {tenantId}/
│       └── {vehicleId}/
│           ├── main.webp          # Photo principale (redimensionnée)
│           ├── main-thumb.webp    # Thumbnail 200x200
│           └── gallery-{n}.webp   # Photos supplémentaires
├── inspection-photos/       # Privé, RLS par tenantId
│   └── {tenantId}/
│       └── {inspectionId}/
│           ├── damage-{n}.webp    # Photos de dommages
│           └── overview-{n}.webp  # Photos d'ensemble
├── client-documents/        # Privé, RLS par tenantId
│   └── {tenantId}/
│       └── {clientId}/
│           ├── license-front.webp
│           └── license-back.webp
└── generated-pdfs/          # Privé, RLS par tenantId
    └── {tenantId}/
        └── {contractId}/
            ├── contract.pdf
            ├── invoice-{n}.pdf
            └── inspection-{type}.pdf
```

### 3.2 Upload avec compression

Les photos d'inspection prises sur téléphone font facilement 5-10 MB. Il faut compresser côté client avant l'upload.

```typescript
// src/lib/image-upload.ts
import imageCompression from "browser-image-compression";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,           // Max 1 MB après compression
  maxWidthOrHeight: 1920,  // Max 1920px
  useWebWorker: true,
  fileType: "image/webp",  // Convertir en WebP (30-50% plus petit que JPEG)
};

const THUMBNAIL_OPTIONS = {
  maxSizeMB: 0.1,
  maxWidthOrHeight: 200,
  useWebWorker: true,
  fileType: "image/webp",
};

export async function uploadVehiclePhoto(
  file: File,
  vehicleId: string,
  tenantId: string
): Promise<{ url: string; thumbUrl: string }> {
  // Compresser en parallèle
  const [compressed, thumbnail] = await Promise.all([
    imageCompression(file, COMPRESSION_OPTIONS),
    imageCompression(file, THUMBNAIL_OPTIONS),
  ]);

  const basePath = `${tenantId}/${vehicleId}`;
  const filename = `${Date.now()}.webp`;

  // Upload en parallèle
  const [mainResult, thumbResult] = await Promise.all([
    supabase.storage.from("vehicle-photos").upload(`${basePath}/${filename}`, compressed),
    supabase.storage.from("vehicle-photos").upload(`${basePath}/thumb-${filename}`, thumbnail),
  ]);

  return {
    url: mainResult.data!.path,
    thumbUrl: thumbResult.data!.path,
  };
}
```

### 3.3 Limites et validation

```typescript
// src/lib/constants.ts
export const FILE_LIMITS = {
  vehiclePhoto: {
    maxSize: 10 * 1024 * 1024, // 10 MB (avant compression)
    maxCount: 10,               // 10 photos par véhicule
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  },
  inspectionPhoto: {
    maxSize: 10 * 1024 * 1024,
    maxCount: 20,               // 20 photos par inspection
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
  },
  clientDocument: {
    maxSize: 5 * 1024 * 1024,   // 5 MB
    maxCount: 5,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  },
  generatedPdf: {
    maxSize: 2 * 1024 * 1024,   // 2 MB
  },
};

// Estimation stockage : 100 véhicules × 10 photos × 1 MB = 1 GB
// + 500 contrats × 20 photos inspection × 1 MB = 10 GB
// + PDFs ~500 MB
// Total estimé V1 : ~12 GB (bien dans les limites Supabase Pro : 100 GB)
```

---

## 4. Optimisation des requêtes

### 4.1 Éviter les N+1

**Anti-pattern (N+1) :**
```typescript
// ❌ BAD: 1 query pour les contrats + N queries pour les clients
const contracts = await db.query.rentalContracts.findMany();
for (const contract of contracts) {
  contract.client = await db.query.clients.findFirst({
    where: eq(clients.id, contract.clientId),
  });
}
```

**Pattern correct (eager loading) :**
```typescript
// ✅ GOOD: 1 query avec jointure
const contracts = await db.query.rentalContracts.findMany({
  where: and(
    eq(rentalContracts.tenantId, session.tenantId),
    isNull(rentalContracts.deletedAt)
  ),
  with: {
    client: true,
    vehicle: { with: { category: true } },
    inspections: true,
  },
});
```

### 4.2 Requêtes de planning (planby)

La requête la plus complexe de l'app : afficher le planning de tous les véhicules avec tous les contrats pour une période donnée.

```typescript
// src/actions/planning.queries.ts
export async function getPlanningData(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  // Une seule requête avec les jointures nécessaires
  const data = await db.query.vehicles.findMany({
    where: and(
      eq(vehicles.tenantId, tenantId),
      isNull(vehicles.deletedAt),
      ne(vehicles.status, "retired")
    ),
    with: {
      category: true,
      contracts: {
        where: and(
          lte(rentalContracts.startDate, endDate),
          gte(rentalContracts.endDate, startDate),
          ne(rentalContracts.status, "cancelled")
        ),
        with: {
          client: {
            columns: { firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: [asc(vehicles.brand), asc(vehicles.model)],
  });

  return data;
}
```

### 4.3 Dashboard aggregations

Les stats du dashboard (nombre de contrats actifs, revenue du mois, taux d'occupation) sont coûteuses à calculer. Utiliser des requêtes SQL agrégées plutôt que de charger tous les enregistrements.

```typescript
// src/actions/dashboard.queries.ts
export async function getDashboardStats(tenantId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [vehicleStats, contractStats, revenueStats] = await Promise.all([
    // Véhicules par statut
    db
      .select({
        status: vehicles.status,
        count: count(),
      })
      .from(vehicles)
      .where(and(eq(vehicles.tenantId, tenantId), isNull(vehicles.deletedAt)))
      .groupBy(vehicles.status),

    // Contrats actifs
    db
      .select({ count: count() })
      .from(rentalContracts)
      .where(and(
        eq(rentalContracts.tenantId, tenantId),
        eq(rentalContracts.status, "active"),
      )),

    // Revenue du mois
    db
      .select({ total: sum(invoices.totalAmount) })
      .from(invoices)
      .where(and(
        eq(invoices.tenantId, tenantId),
        gte(invoices.issueDate, startOfMonth),
        eq(invoices.status, "paid"),
      )),
  ]);

  return { vehicleStats, contractStats, revenueStats };
}
```

---

## 5. Error Boundaries React

Sans Error Boundaries, si un composant crash (erreur JS, données malformées), **toute la page meurt** et affiche un écran blanc.

### 5.1 Error Boundary global

```typescript
// src/app/[locale]/(dashboard)/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
      <p className="text-muted-foreground">
        {process.env.NODE_ENV === "development" ? error.message : "Veuillez réessayer."}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-white rounded-md"
      >
        Réessayer
      </button>
    </div>
  );
}
```

### 5.2 Error Boundaries par section

```
src/app/[locale]/(dashboard)/
├── error.tsx                    # Error boundary global dashboard
├── vehicles/
│   ├── error.tsx                # Error boundary véhicules
│   └── [id]/error.tsx           # Error boundary détail véhicule
├── clients/
│   └── error.tsx
├── contracts/
│   └── error.tsx
└── planning/
    └── error.tsx                # Important : le planning est le composant le plus complexe
```

### 5.3 Not Found pages

```typescript
// src/app/[locale]/(dashboard)/vehicles/[id]/not-found.tsx
export default function VehicleNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-xl font-semibold">Véhicule introuvable</h2>
      <p className="text-muted-foreground">
        Ce véhicule n'existe pas ou a été supprimé.
      </p>
      <Link href="/vehicles" className="text-primary underline">
        Retour à la liste
      </Link>
    </div>
  );
}
```

---

## 6. Résilience réseau

L'agent de location est potentiellement dans un garage avec du réseau instable. L'app doit rester utilisable.

### 6.1 Optimistic Updates

Pour les mutations fréquentes (changer le statut d'un véhicule, valider une étape d'inspection), utiliser des optimistic updates via `useTransition` :

```typescript
// src/components/vehicle-status-toggle.tsx
"use client";

import { useTransition } from "react";
import { updateVehicleStatus } from "@/actions/vehicle.actions";

export function VehicleStatusToggle({ vehicleId, currentStatus }) {
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      // L'UI se met à jour immédiatement (optimistic)
      // Si l'action échoue, Next.js revert automatiquement
      await updateVehicleStatus(vehicleId, newStatus);
    });
  }

  return (
    <button
      onClick={() => handleStatusChange("maintenance")}
      disabled={isPending}
      className={isPending ? "opacity-50" : ""}
    >
      {isPending ? "Mise à jour..." : "Passer en maintenance"}
    </button>
  );
}
```

### 6.2 Toast feedback systématique

Chaque Server Action doit donner un feedback visuel via Sonner :

```typescript
// Pattern standard pour les Server Actions côté client
"use client";

import { toast } from "sonner";

async function handleSubmit(data: FormData) {
  const result = await createClient(data);
  
  if (result.success) {
    toast.success("Client créé avec succès");
    router.push(`/clients/${result.data.id}`);
  } else {
    toast.error(result.error || "Une erreur est survenue");
  }
}
```

### 6.3 Offline : hors scope V1

Un vrai mode offline nécessiterait un Service Worker + IndexedDB + sync queue, ce qui est disproportionné pour la V1. En revanche, on peut :
- Afficher un banner "Connexion perdue" quand `navigator.onLine === false`
- Empêcher les soumissions de formulaires hors-ligne (éviter les erreurs silencieuses)

```typescript
// src/components/shared/offline-banner.tsx
"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground text-center py-2 text-sm z-50">
      Connexion perdue — les modifications ne seront pas sauvegardées
    </div>
  );
}
```

---

## 7. User Stories Performance

### US-PERF-1: Pagination standardisée (Transverse)

**As a** user viewing any data list
**I want** consistent pagination with search and sorting
**So that** I can efficiently find data even with thousands of records

**Acceptance Criteria:**
```gherkin
Given a DataTable displays clients
When there are 500 clients
Then I see 20 per page with page numbers
And I can sort by any column header
And I can search by name or email (debounced 300ms)
And the URL updates with query params (?page=2&search=dupont&sort=lastName)
```

**Effort :** 2h (helper réutilisable) | **Priority :** 🔴 Sprint 1

---

### US-PERF-2: Image upload avec compression (Epic 2 + 4)

**As a** agent uploading vehicle or inspection photos
**I want** photos automatically compressed before upload
**So that** storage costs stay low and the app stays fast on slow connections

**Acceptance Criteria:**
```gherkin
Given I upload a 8 MB JPEG photo
When the upload processes
Then the stored photo is < 1 MB in WebP format
And a 200x200 thumbnail is generated
And both are stored in Supabase Storage with signed URLs

Given I upload a HEIC photo from an iPhone
When the upload processes
Then it is converted to WebP automatically
```

**Effort :** 3h | **Priority :** 🟡 Sprint 2 (avec Epic 2)

---

### US-PERF-3: Error Boundaries (Epic 1 — Foundation)

**As a** user
**I want** errors to be contained to the affected section
**So that** a crash in one component doesn't break the entire page

**Acceptance Criteria:**
```gherkin
Given the planning component throws an error
When I'm viewing the dashboard
Then only the planning section shows an error message
And I can click "Retry" to reload just that section
And the rest of the dashboard (sidebar, header, other widgets) remains functional
```

**Effort :** 1h | **Priority :** 🔴 Sprint 1

---

### US-PERF-4: Dashboard avec cache + aggregations (Epic 5)

**As a** admin viewing the dashboard
**I want** stats to load within 500ms
**So that** the dashboard feels snappy even with large datasets

**Acceptance Criteria:**
```gherkin
Given the dashboard displays vehicle stats, active contracts, and monthly revenue
When I load the page
Then stats are served from cache (< 500ms)
And the cache is invalidated when a contract or invoice is created/updated
And a "Last updated" timestamp shows when the data was last refreshed
```

**Effort :** 2h | **Priority :** 🟡 Sprint 3 (avec Epic 5)

---

## 8. Checklist performance pré-production

- [ ] Pagination helper créé et testé
- [ ] `unstable_cache` + `revalidateTag` sur les queries fréquentes
- [ ] `cache()` de React sur les queries de détail (déduplification)
- [ ] Compression d'images côté client (browser-image-compression)
- [ ] Thumbnails générés pour toutes les photos
- [ ] Supabase Storage buckets créés (privés, avec RLS)
- [ ] Error Boundaries sur chaque section du dashboard
- [ ] Not Found pages pour les routes dynamiques
- [ ] Offline banner composant
- [ ] Toast feedback sur toutes les Server Actions
- [ ] Dashboard stats via requêtes agrégées (pas de `findMany` + JS)
- [ ] Index trigram pour la recherche textuelle (clients, véhicules)
- [ ] Planning query optimisée (1 query avec jointures)
- [ ] Pas de N+1 queries (vérifier avec le subagent db-analyst)
