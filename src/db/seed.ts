import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import * as schema from "./schema";
import {
  SEED_TENANT,
  SEED_USERS,
  SEED_CATEGORIES,
  SEED_VEHICLES,
  SEED_CLIENTS,
  SEED_CONTRACTS,
  SEED_INVOICES,
  SEED_PAYMENTS,
  SEED_DOSSIERS,
  DEFAULT_SEED_PASSWORD,
  seedConfigSchema,
} from "./seed-data";

const {
  tenants,
  users,
  accounts,
  vehicleCategories,
  vehicles,
  clients,
  rentalContracts,
  invoices,
  payments,
  rentalDossiers,
} = schema;

async function seed() {
  // ── Validate seed data before running ───────────────────────────────────
  const config = {
    tenant: SEED_TENANT,
    users: SEED_USERS as unknown as Array<(typeof SEED_USERS)[number]>,
    categories: SEED_CATEGORIES as unknown as Array<
      (typeof SEED_CATEGORIES)[number]
    >,
    vehicles: SEED_VEHICLES as unknown as Array<(typeof SEED_VEHICLES)[number]>,
    clients: SEED_CLIENTS as unknown as Array<(typeof SEED_CLIENTS)[number]>,
    contracts: SEED_CONTRACTS as unknown as Array<
      (typeof SEED_CONTRACTS)[number]
    >,
    invoices: SEED_INVOICES as unknown as Array<(typeof SEED_INVOICES)[number]>,
    payments: SEED_PAYMENTS as unknown as Array<(typeof SEED_PAYMENTS)[number]>,
    dossiers: SEED_DOSSIERS as unknown as Array<(typeof SEED_DOSSIERS)[number]>,
  };

  const validation = seedConfigSchema.safeParse(config);
  if (!validation.success) {
    console.error("❌ Seed data validation failed:", validation.error.format());
    process.exit(1);
  }

  // ── Resolve passwords with fallback ─────────────────────────────────────
  const passwords = {
    admin: process.env.SEED_ADMIN_PASSWORD || DEFAULT_SEED_PASSWORD,
    agent: process.env.SEED_AGENT_PASSWORD || DEFAULT_SEED_PASSWORD,
    viewer: process.env.SEED_VIEWER_PASSWORD || DEFAULT_SEED_PASSWORD,
  };

  if (
    !process.env.SEED_ADMIN_PASSWORD ||
    !process.env.SEED_AGENT_PASSWORD ||
    !process.env.SEED_VIEWER_PASSWORD
  ) {
    console.warn(
      "⚠ SEED_*_PASSWORD env vars not set — using default password for dev"
    );
  }

  const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!;
  const client = postgres(connectionUrl);
  const db = drizzle(client, { schema });

  try {
    // ── Tenant ──────────────────────────────────────────────────────────
    await db
      .insert(tenants)
      .values({ ...SEED_TENANT })
      .onConflictDoNothing();

    console.log("✓ Tenant seeded");

    // ── Users ───────────────────────────────────────────────────────────
    for (const u of SEED_USERS) {
      await db
        .insert(users)
        .values({
          id: u.id,
          tenantId: SEED_TENANT.id,
          email: u.email,
          name: u.name,
          role: u.role,
          emailVerified: true,
          isActive: true,
        })
        .onConflictDoNothing();

      const hashedPassword = await hashPassword(passwords[u.role]);

      await db
        .insert(accounts)
        .values({
          id: crypto.randomUUID(),
          userId: u.id,
          providerId: "credential",
          accountId: u.id,
          password: hashedPassword,
        })
        .onConflictDoNothing();
    }

    console.log("✓ Users seeded (admin, agent, viewer)");

    // ── Vehicle Categories ──────────────────────────────────────────────
    for (const cat of SEED_CATEGORIES) {
      await db
        .insert(vehicleCategories)
        .values({ ...cat, tenantId: SEED_TENANT.id })
        .onConflictDoNothing();
    }

    console.log("✓ Vehicle categories seeded (4)");

    // ── Vehicles ────────────────────────────────────────────────────────
    for (const v of SEED_VEHICLES) {
      await db
        .insert(vehicles)
        .values({ ...v, tenantId: SEED_TENANT.id })
        .onConflictDoNothing();
    }

    console.log("✓ Vehicles seeded (8)");

    // ── Clients ─────────────────────────────────────────────────────────
    for (const c of SEED_CLIENTS) {
      await db
        .insert(clients)
        .values({ ...c, tenantId: SEED_TENANT.id })
        .onConflictDoNothing();
    }

    console.log("✓ Clients seeded (7)");

    // ── Rental Contracts ──────────────────────────────────────────────────
    for (const c of SEED_CONTRACTS) {
      await db
        .insert(rentalContracts)
        .values({
          id: c.id,
          tenantId: SEED_TENANT.id,
          contractNumber: c.contractNumber,
          clientId: c.clientId,
          vehicleId: c.vehicleId,
          createdByUserId: c.createdByUserId,
          status: c.status,
          startDate: new Date(c.startDate),
          endDate: new Date(c.endDate),
          actualReturnDate: c.actualReturnDate
            ? new Date(c.actualReturnDate)
            : null,
          pickupLocation: c.pickupLocation,
          returnLocation: c.returnLocation,
          departureMileage: c.departureMileage,
          returnMileage: c.returnMileage,
          includedKmPerDay: c.includedKmPerDay,
          excessKmRate: c.excessKmRate,
          dailyRate: c.dailyRate,
          totalDays: c.totalDays,
          baseAmount: c.baseAmount,
          optionsAmount: c.optionsAmount,
          excessKmAmount: c.excessKmAmount,
          damagesAmount: c.damagesAmount,
          totalAmount: c.totalAmount,
          depositAmount: c.depositAmount,
          depositStatus: c.depositStatus,
          depositReturnedAmount: c.depositReturnedAmount,
          depositReturnedDate: c.depositReturnedDate
            ? new Date(c.depositReturnedDate)
            : null,
          termsAccepted: c.termsAccepted,
        })
        .onConflictDoNothing();
    }

    console.log(`✓ Rental contracts seeded (${SEED_CONTRACTS.length})`);

    // ── Invoices ──────────────────────────────────────────────────────────
    for (const inv of SEED_INVOICES) {
      await db
        .insert(invoices)
        .values({
          id: inv.id,
          tenantId: SEED_TENANT.id,
          contractId: inv.contractId,
          clientId: inv.clientId,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          subtotal: inv.subtotal,
          taxRate: inv.taxRate,
          taxAmount: inv.taxAmount,
          totalAmount: inv.totalAmount,
          lineItems: inv.lineItems,
          issuedAt: new Date(inv.issuedAt),
          dueDate: inv.dueDate,
          notes: "notes" in inv ? (inv as { notes: string }).notes : null,
        })
        .onConflictDoNothing();
    }

    console.log(`✓ Invoices seeded (${SEED_INVOICES.length})`);

    // ── Payments ──────────────────────────────────────────────────────────
    for (const p of SEED_PAYMENTS) {
      await db
        .insert(payments)
        .values({
          id: p.id,
          tenantId: SEED_TENANT.id,
          invoiceId: p.invoiceId,
          processedByUserId: p.processedByUserId,
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          paidAt: new Date(p.paidAt),
          notes: "notes" in p ? (p as { notes: string }).notes : null,
        })
        .onConflictDoNothing();
    }

    console.log(`✓ Payments seeded (${SEED_PAYMENTS.length})`);

    // ── Rental Dossiers ───────────────────────────────────────────────────
    for (const d of SEED_DOSSIERS) {
      await db
        .insert(rentalDossiers)
        .values({
          id: d.id,
          tenantId: SEED_TENANT.id,
          contractId: d.contractId,
          invoiceId: d.invoiceId,
          dossierNumber: d.dossierNumber,
          status: d.status,
          clientName: d.clientName,
          vehicleInfo: d.vehicleInfo,
          rentalPeriod: d.rentalPeriod,
          totalAmount: d.totalAmount,
          archivedAt:
            "archivedAt" in d
              ? new Date((d as { archivedAt: string }).archivedAt)
              : null,
        })
        .onConflictDoNothing();
    }

    console.log(`✓ Rental dossiers seeded (${SEED_DOSSIERS.length})`);
    console.log("\n✅ Seed completed successfully!");
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
