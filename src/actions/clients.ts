"use server";

import {
  eq,
  and,
  or,
  ilike,
  isNull,
  notInArray,
  desc,
  asc,
  sql,
  count,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  clients,
  clientDocuments,
  rentalContracts,
  vehicles,
} from "@/db/schema";
import { requirePermission, AuthorizationError } from "@/lib/rbac-guards";
import {
  quickCreateClientSchema,
  clientFormSchema,
  clientListParamsSchema,
} from "@/lib/validations/clients";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { ActionResult, SelectClientDocument } from "@/types";
import type { ClientSelectItem } from "@/actions/contracts";

const uuidSchema = z.string().uuid();
const STORAGE_BUCKET = "client-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

// ============================================================================
// Types
// ============================================================================

export type ClientListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  licenseNumber: string | null;
  isTrusted: boolean;
  contractCount: number;
  createdAt: Date;
};

export type ClientListResult = {
  clients: ClientListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ClientDetail = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string | null;
  address: string | null;
  licenseNumber: string | null;
  licenseCategory: string | null;
  licenseExpiry: string | null;
  identityDocType: string | null;
  identityDocNumber: string | null;
  companyName: string | null;
  notes: string | null;
  isTrusted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ClientDocument = {
  id: string;
  type: string;
  label: string | null;
  url: string;
  fileName: string | null;
  createdAt: Date;
};

export type ContractSummary = {
  id: string;
  contractNumber: string;
  vehicleBrand: string;
  vehicleModel: string;
  startDate: Date;
  endDate: Date;
  status: string;
  totalAmount: string;
};

export type ClientKPIs = {
  totalClients: number;
  trustedClients: number;
  activeRentals: number;
};

// ============================================================================
// listClients — paginated list with search
// ============================================================================

export async function listClients(
  input: unknown
): Promise<ActionResult<ClientListResult>> {
  try {
    const currentUser = await requirePermission("clients", "read");
    const { tenantId } = currentUser;

    const parsed = clientListParamsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Parametres invalides",
      };
    }

    const { page, pageSize, search, sortBy, sortOrder } = parsed.data;
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [
      eq(clients.tenantId, tenantId),
      isNull(clients.deletedAt),
    ];

    if (search && search.trim().length >= 2) {
      const pattern = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(clients.firstName, pattern),
          ilike(clients.lastName, pattern),
          ilike(clients.email, pattern),
          ilike(clients.phone, pattern)
        )!
      );
    }

    const whereClause = and(...conditions);

    // Sort config
    const sortColumn = (() => {
      switch (sortBy) {
        case "firstName":
          return clients.firstName;
        case "lastName":
          return clients.lastName;
        case "email":
          return clients.email;
        case "phone":
          return clients.phone;
        case "isTrusted":
          return clients.isTrusted;
        case "createdAt":
          return clients.createdAt;
        default:
          return clients.lastName;
      }
    })();
    const orderFn = sortOrder === "asc" ? asc : desc;

    // Fetch clients with contract count subquery (filtered by tenant)
    const contractCountSq = db
      .select({
        clientId: rentalContracts.clientId,
        count: count().as("contract_count"),
      })
      .from(rentalContracts)
      .innerJoin(clients, eq(rentalContracts.clientId, clients.id))
      .where(eq(clients.tenantId, tenantId))
      .groupBy(rentalContracts.clientId)
      .as("contract_counts");

    // Execute data + count queries in parallel
    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
          phone: clients.phone,
          licenseNumber: clients.licenseNumber,
          isTrusted: clients.isTrusted,
          createdAt: clients.createdAt,
          contractCount:
            sql<number>`COALESCE(${contractCountSq.count}, 0)`.mapWith(Number),
        })
        .from(clients)
        .leftJoin(contractCountSq, eq(clients.id, contractCountSq.clientId))
        .where(whereClause)
        .orderBy(orderFn(sortColumn))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(clients).where(whereClause),
    ]);

    const totalCount = countResult[0]?.value ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: {
        clients: rows,
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "listClients error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return {
      success: false,
      error: "Une erreur est survenue lors du chargement des clients",
    };
  }
}

// ============================================================================
// getClient — full detail with documents and recent contracts
// ============================================================================

export async function getClient(
  id: string
): Promise<ActionResult<ClientDetail>> {
  try {
    const currentUser = await requirePermission("clients", "read");
    const { tenantId } = currentUser;

    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Client introuvable" };
    }

    const [client] = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        dateOfBirth: clients.dateOfBirth,
        address: clients.address,
        licenseNumber: clients.licenseNumber,
        licenseCategory: clients.licenseCategory,
        licenseExpiry: clients.licenseExpiry,
        identityDocType: clients.identityDocType,
        identityDocNumber: clients.identityDocNumber,
        companyName: clients.companyName,
        notes: clients.notes,
        isTrusted: clients.isTrusted,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
      })
      .from(clients)
      .where(
        and(
          eq(clients.id, id),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      );

    if (!client) {
      return { success: false, error: "Client introuvable" };
    }

    return { success: true, data: client };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getClient error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// getClientDocuments
// ============================================================================

export async function getClientDocuments(
  clientId: string
): Promise<ActionResult<ClientDocument[]>> {
  try {
    const currentUser = await requirePermission("clients", "read");
    const { tenantId } = currentUser;

    if (!uuidSchema.safeParse(clientId).success) {
      return { success: false, error: "Client introuvable" };
    }

    // Verify client belongs to tenant
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      );

    if (!client) {
      return { success: false, error: "Client introuvable" };
    }

    const docs = await db
      .select({
        id: clientDocuments.id,
        type: clientDocuments.type,
        label: clientDocuments.label,
        url: clientDocuments.url,
        fileName: clientDocuments.fileName,
        createdAt: clientDocuments.createdAt,
      })
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, clientId))
      .orderBy(desc(clientDocuments.createdAt));

    // Generate signed URLs (1 hour expiry) — never expose public URLs
    const supabase = getSupabaseServerClient();
    const docsWithSignedUrls = await Promise.all(
      docs.map(async (doc) => {
        const { data } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(doc.url, 3600);
        return {
          ...doc,
          url: data?.signedUrl ?? doc.url,
        };
      })
    );

    return { success: true, data: docsWithSignedUrls };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getClientDocuments error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// getClientContracts — recent contracts for client detail
// ============================================================================

export async function getClientContracts(
  clientId: string
): Promise<ActionResult<ContractSummary[]>> {
  try {
    const currentUser = await requirePermission("clients", "read");
    const { tenantId } = currentUser;

    if (!uuidSchema.safeParse(clientId).success) {
      return { success: false, error: "Client introuvable" };
    }

    const rows = await db
      .select({
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        startDate: rentalContracts.startDate,
        endDate: rentalContracts.endDate,
        status: rentalContracts.status,
        totalAmount: rentalContracts.totalAmount,
      })
      .from(rentalContracts)
      .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
      .where(
        and(
          eq(rentalContracts.clientId, clientId),
          eq(rentalContracts.tenantId, tenantId)
        )
      )
      .orderBy(desc(rentalContracts.createdAt))
      .limit(5);

    return { success: true, data: rows };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getClientContracts error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// getClientKPIs
// ============================================================================

export async function getClientKPIs(): Promise<ActionResult<ClientKPIs>> {
  try {
    const currentUser = await requirePermission("clients", "read");
    const { tenantId } = currentUser;

    // Single query for all 3 KPIs
    const [kpiResult] = await db
      .select({
        totalClients: count().as("total_clients"),
        trustedClients:
          sql<number>`COUNT(*) FILTER (WHERE ${clients.isTrusted} = true)`.mapWith(
            Number
          ),
        activeRentals:
          sql<number>`COUNT(DISTINCT ${rentalContracts.clientId}) FILTER (WHERE ${rentalContracts.status} = 'active')`.mapWith(
            Number
          ),
      })
      .from(clients)
      .leftJoin(rentalContracts, eq(rentalContracts.clientId, clients.id))
      .where(and(eq(clients.tenantId, tenantId), isNull(clients.deletedAt)));

    return {
      success: true,
      data: {
        totalClients: kpiResult?.totalClients ?? 0,
        trustedClients: kpiResult?.trustedClients ?? 0,
        activeRentals: kpiResult?.activeRentals ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "getClientKPIs error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// createClient — full create from the client form
// ============================================================================

export async function createClient(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("clients", "create");
    const { tenantId } = currentUser;

    const parsed = clientFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Donnees invalides",
      };
    }

    const data = parsed.data;

    const [inserted] = await db
      .insert(clients)
      .values({
        tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ?? null,
        address: data.address ?? null,
        licenseNumber: data.licenseNumber ?? null,
        licenseCategory: data.licenseCategory ?? null,
        licenseExpiry: data.licenseExpiry ?? null,
        identityDocType: data.identityDocType ?? null,
        identityDocNumber: data.identityDocNumber ?? null,
        companyName: data.companyName ?? null,
        notes: data.notes ?? null,
        isTrusted: data.isTrusted,
      })
      .returning({ id: clients.id });

    if (!inserted) {
      return { success: false, error: "Erreur lors de la creation du client" };
    }

    revalidatePath("/clients");

    return { success: true, data: { id: inserted.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "createClient error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// updateClient — full update from the client form
// ============================================================================

export async function updateClient(
  id: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("clients", "update");
    const { tenantId } = currentUser;

    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Client introuvable" };
    }

    const parsed = clientFormSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Donnees invalides",
      };
    }

    const data = parsed.data;

    // Verify client exists, belongs to tenant, not soft-deleted
    const [existing] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, id),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      );

    if (!existing) {
      return { success: false, error: "Client introuvable" };
    }

    const [updated] = await db
      .update(clients)
      .set({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ?? null,
        address: data.address ?? null,
        licenseNumber: data.licenseNumber ?? null,
        licenseCategory: data.licenseCategory ?? null,
        licenseExpiry: data.licenseExpiry ?? null,
        identityDocType: data.identityDocType ?? null,
        identityDocNumber: data.identityDocNumber ?? null,
        companyName: data.companyName ?? null,
        notes: data.notes ?? null,
        isTrusted: data.isTrusted,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clients.id, id),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      )
      .returning({ id: clients.id });

    if (!updated) {
      return { success: false, error: "Client introuvable" };
    }

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);

    return { success: true, data: { id: updated.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "updateClient error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// toggleClientTrusted
// ============================================================================

export async function toggleClientTrusted(
  id: string
): Promise<ActionResult<{ id: string; isTrusted: boolean }>> {
  try {
    const currentUser = await requirePermission("clients", "update");
    const { tenantId } = currentUser;

    // Get current value
    const [current] = await db
      .select({ isTrusted: clients.isTrusted })
      .from(clients)
      .where(
        and(
          eq(clients.id, id),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      );

    if (!current) {
      return { success: false, error: "Client introuvable" };
    }

    const newValue = !current.isTrusted;

    await db
      .update(clients)
      .set({ isTrusted: newValue, updatedAt: new Date() })
      .where(eq(clients.id, id));

    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);

    return { success: true, data: { id, isTrusted: newValue } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "toggleClientTrusted error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// softDeleteClient
// ============================================================================

export async function softDeleteClient(
  id: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("clients", "delete");
    const { tenantId } = currentUser;

    if (!uuidSchema.safeParse(id).success) {
      return { success: false, error: "Client introuvable" };
    }

    // Check for active contracts (any status other than completed/cancelled)
    const [activeContract] = await db
      .select({ id: rentalContracts.id })
      .from(rentalContracts)
      .where(
        and(
          eq(rentalContracts.clientId, id),
          eq(rentalContracts.tenantId, tenantId),
          notInArray(rentalContracts.status, ["completed", "cancelled"])
        )
      )
      .limit(1);

    if (activeContract) {
      return {
        success: false,
        error: "Ce client a des contrats actifs et ne peut pas etre supprime.",
      };
    }

    const [deleted] = await db
      .update(clients)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(clients.id, id),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      )
      .returning({ id: clients.id });

    if (!deleted) {
      return { success: false, error: "Client introuvable" };
    }

    revalidatePath("/clients");

    return { success: true, data: { id: deleted.id } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "softDeleteClient error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// searchClients — debounced autocomplete search
// ============================================================================

export async function searchClients(
  query: string
): Promise<ActionResult<ClientSelectItem[]>> {
  try {
    const currentUser = await requirePermission("contracts", "create");
    const { tenantId } = currentUser;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { success: true, data: [] };
    }

    const pattern = `%${trimmed}%`;

    const results = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        isTrusted: clients.isTrusted,
      })
      .from(clients)
      .where(
        and(
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt),
          or(
            ilike(clients.firstName, pattern),
            ilike(clients.lastName, pattern),
            ilike(clients.email, pattern),
            ilike(clients.phone, pattern)
          )
        )
      )
      .limit(10);

    return { success: true, data: results };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "searchClients error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// quickCreateClient — create a client from the contract form
// ============================================================================

export async function quickCreateClient(
  input: unknown
): Promise<ActionResult<ClientSelectItem>> {
  try {
    const currentUser = await requirePermission("contracts", "create");
    const { tenantId } = currentUser;

    const parsed = quickCreateClientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Donnees invalides",
      };
    }

    const { firstName, lastName, phone, email, licenseNumber, isTrusted } =
      parsed.data;

    const [inserted] = await db
      .insert(clients)
      .values({
        tenantId,
        firstName,
        lastName,
        phone,
        email,
        licenseNumber: licenseNumber ?? null,
        isTrusted,
      })
      .returning({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone,
        isTrusted: clients.isTrusted,
      });

    if (!inserted) {
      return { success: false, error: "Erreur lors de la creation du client" };
    }

    revalidatePath("/clients");

    return { success: true, data: inserted };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "quickCreateClient error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// uploadClientDocument — upload to Supabase Storage + create DB entry
// ============================================================================

export async function uploadClientDocument(
  clientId: string,
  formData: FormData
): Promise<ActionResult<SelectClientDocument>> {
  try {
    const currentUser = await requirePermission("clients", "update");
    const { tenantId } = currentUser;

    if (!uuidSchema.safeParse(clientId).success) {
      return { success: false, error: "Client introuvable" };
    }

    // Verify client belongs to tenant
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      );

    if (!client) {
      return { success: false, error: "Client introuvable" };
    }

    // Extract file from FormData
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return { success: false, error: "Aucun fichier fourni" };
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        success: false,
        error:
          "Type de fichier non autorise. Formats acceptes : PDF, JPG, PNG, WebP",
      };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: "Le fichier ne peut pas depasser 5 Mo",
      };
    }

    // Extract document type from FormData
    const docType = (formData.get("type") as string) || "other";
    const label = (formData.get("label") as string) || null;

    // Upload to Supabase Storage
    const supabase = getSupabaseServerClient();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `clients/${tenantId}/${clientId}/${timestamp}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      return {
        success: false,
        error: "Erreur lors de l'envoi du fichier",
      };
    }

    // Create DB entry — store relative storage path, NOT public URL
    const [doc] = await db
      .insert(clientDocuments)
      .values({
        clientId,
        type: docType as
          | "driving_license"
          | "identity_card"
          | "proof_of_address"
          | "other",
        label,
        url: storagePath,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      })
      .returning();

    if (!doc) {
      return {
        success: false,
        error: "Erreur lors de l'enregistrement du document",
      };
    }

    revalidatePath(`/clients/${clientId}`);

    return { success: true, data: doc };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "uploadClientDocument error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}

// ============================================================================
// deleteClientDocument — remove from Storage + DB
// ============================================================================

export async function deleteClientDocument(
  documentId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const currentUser = await requirePermission("clients", "update");
    const { tenantId } = currentUser;

    if (!uuidSchema.safeParse(documentId).success) {
      return { success: false, error: "Document introuvable" };
    }

    // Get document with client ownership check
    const [doc] = await db
      .select({
        id: clientDocuments.id,
        clientId: clientDocuments.clientId,
        url: clientDocuments.url,
      })
      .from(clientDocuments)
      .innerJoin(
        clients,
        and(
          eq(clientDocuments.clientId, clients.id),
          eq(clients.tenantId, tenantId),
          isNull(clients.deletedAt)
        )
      )
      .where(eq(clientDocuments.id, documentId));

    if (!doc) {
      return { success: false, error: "Document introuvable" };
    }

    // Delete from Supabase Storage (url column stores relative path)
    try {
      const supabase = getSupabaseServerClient();
      await supabase.storage.from(STORAGE_BUCKET).remove([doc.url]);
    } catch (storageErr) {
      console.error(
        "Storage deletion error (continuing with DB deletion):",
        storageErr instanceof Error ? storageErr.message : "Unknown error"
      );
    }

    // Delete DB entry
    await db.delete(clientDocuments).where(eq(clientDocuments.id, documentId));

    revalidatePath(`/clients/${doc.clientId}`);

    return { success: true, data: { id: documentId } };
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return { success: false, error: err.message };
    }
    console.error(
      "deleteClientDocument error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return { success: false, error: "Une erreur est survenue" };
  }
}
