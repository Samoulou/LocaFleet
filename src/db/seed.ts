import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";
import * as schema from "./schema";

const {
  tenants,
  users,
  accounts,
  vehicleCategories,
  vehicles,
  clients,
} = schema;

async function seed() {
  const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL!;
  const client = postgres(connectionUrl);
  const db = drizzle(client, { schema });

  try {
    // ── Tenant ──────────────────────────────────────────────────────────
    const tenantId = "00000000-0000-0000-0000-000000000001";
    await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: "LocaFleet Demo",
        slug: "demo",
        address: "Rue du Marché 12, 1204 Genève",
        phone: "+41 22 123 45 67",
        email: "contact@locafleet.ch",
      })
      .onConflictDoNothing();

    console.log("✓ Tenant seeded");

    // ── Users ───────────────────────────────────────────────────────────
    const seedUsers = [
      {
        id: "00000000-0000-0000-0000-000000000010",
        email: "admin@locafleet.ch",
        name: "Admin LocaFleet",
        role: "admin" as const,
        password: process.env.SEED_ADMIN_PASSWORD!,
      },
      {
        id: "00000000-0000-0000-0000-000000000011",
        email: "agent@locafleet.ch",
        name: "Agent LocaFleet",
        role: "agent" as const,
        password: process.env.SEED_AGENT_PASSWORD!,
      },
      {
        id: "00000000-0000-0000-0000-000000000012",
        email: "viewer@locafleet.ch",
        name: "Viewer LocaFleet",
        role: "viewer" as const,
        password: process.env.SEED_VIEWER_PASSWORD!,
      },
    ];

    for (const u of seedUsers) {
      await db
        .insert(users)
        .values({
          id: u.id,
          tenantId,
          email: u.email,
          name: u.name,
          role: u.role,
          emailVerified: true,
          isActive: true,
        })
        .onConflictDoNothing();

      const hashedPassword = await hashPassword(u.password);

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
    const categoryData = [
      {
        id: "00000000-0000-0000-0000-000000000100",
        name: "Citadine",
        dailyRate: "45.00",
        weeklyRate: "270.00",
        sortOrder: 1,
      },
      {
        id: "00000000-0000-0000-0000-000000000101",
        name: "Berline",
        dailyRate: "65.00",
        weeklyRate: "390.00",
        sortOrder: 2,
      },
      {
        id: "00000000-0000-0000-0000-000000000102",
        name: "SUV",
        dailyRate: "85.00",
        weeklyRate: "510.00",
        sortOrder: 3,
      },
      {
        id: "00000000-0000-0000-0000-000000000103",
        name: "Utilitaire",
        dailyRate: "75.00",
        weeklyRate: "450.00",
        sortOrder: 4,
      },
    ];

    for (const cat of categoryData) {
      await db
        .insert(vehicleCategories)
        .values({ ...cat, tenantId })
        .onConflictDoNothing();
    }

    console.log("✓ Vehicle categories seeded (4)");

    // ── Vehicles ────────────────────────────────────────────────────────
    const vehicleData = [
      {
        id: "00000000-0000-0000-0000-000000000200",
        categoryId: categoryData[0].id,
        brand: "Renault",
        model: "Clio",
        year: 2023,
        color: "Blanc",
        plateNumber: "GE 123 456",
        mileage: 15200,
        fuelType: "gasoline" as const,
        transmission: "manual" as const,
        status: "available" as const,
      },
      {
        id: "00000000-0000-0000-0000-000000000201",
        categoryId: categoryData[0].id,
        brand: "Peugeot",
        model: "208",
        year: 2022,
        color: "Bleu",
        plateNumber: "GE 234 567",
        mileage: 28400,
        fuelType: "gasoline" as const,
        transmission: "automatic" as const,
        status: "rented" as const,
      },
      {
        id: "00000000-0000-0000-0000-000000000202",
        categoryId: categoryData[1].id,
        brand: "Volkswagen",
        model: "Passat",
        year: 2023,
        color: "Noir",
        plateNumber: "GE 345 678",
        mileage: 12800,
        fuelType: "diesel" as const,
        transmission: "automatic" as const,
        status: "available" as const,
      },
      {
        id: "00000000-0000-0000-0000-000000000203",
        categoryId: categoryData[1].id,
        brand: "BMW",
        model: "Série 3",
        year: 2022,
        color: "Gris",
        plateNumber: "GE 456 789",
        mileage: 35600,
        fuelType: "diesel" as const,
        transmission: "automatic" as const,
        status: "maintenance" as const,
      },
      {
        id: "00000000-0000-0000-0000-000000000204",
        categoryId: categoryData[2].id,
        brand: "Toyota",
        model: "RAV4",
        year: 2024,
        color: "Vert",
        plateNumber: "GE 567 890",
        mileage: 5200,
        fuelType: "hybrid" as const,
        transmission: "automatic" as const,
        status: "available" as const,
      },
      {
        id: "00000000-0000-0000-0000-000000000205",
        categoryId: categoryData[2].id,
        brand: "Audi",
        model: "Q5",
        year: 2023,
        color: "Blanc",
        plateNumber: "GE 678 901",
        mileage: 18900,
        fuelType: "diesel" as const,
        transmission: "automatic" as const,
        status: "rented" as const,
      },
      {
        id: "00000000-0000-0000-0000-000000000206",
        categoryId: categoryData[3].id,
        brand: "Renault",
        model: "Kangoo",
        year: 2023,
        color: "Blanc",
        plateNumber: "GE 789 012",
        mileage: 22100,
        fuelType: "diesel" as const,
        transmission: "manual" as const,
        status: "available" as const,
      },
      {
        id: "00000000-0000-0000-0000-000000000207",
        categoryId: categoryData[3].id,
        brand: "Citroën",
        model: "Berlingo",
        year: 2022,
        color: "Gris",
        plateNumber: "GE 890 123",
        mileage: 41300,
        fuelType: "diesel" as const,
        transmission: "manual" as const,
        status: "maintenance" as const,
      },
    ];

    for (const v of vehicleData) {
      await db
        .insert(vehicles)
        .values({ ...v, tenantId })
        .onConflictDoNothing();
    }

    console.log("✓ Vehicles seeded (8)");

    // ── Clients ─────────────────────────────────────────────────────────
    const clientData = [
      {
        id: "00000000-0000-0000-0000-000000000300",
        firstName: "Jean",
        lastName: "Dupont",
        phone: "+41 79 100 00 01",
        email: "jean.dupont@example.ch",
        address: "Avenue de la Gare 5, 1003 Lausanne",
        licenseNumber: "CH-1234567",
        licenseCategory: "B",
      },
      {
        id: "00000000-0000-0000-0000-000000000301",
        firstName: "Marie",
        lastName: "Martin",
        phone: "+41 79 200 00 02",
        email: "marie.martin@example.ch",
        address: "Rue de Berne 18, 1201 Genève",
        licenseNumber: "CH-2345678",
        licenseCategory: "B",
      },
      {
        id: "00000000-0000-0000-0000-000000000302",
        firstName: "Pierre",
        lastName: "Bernard",
        phone: "+41 79 300 00 03",
        email: "pierre.bernard@example.ch",
        address: "Bahnhofstrasse 42, 8001 Zürich",
        licenseNumber: "CH-3456789",
        licenseCategory: "B",
      },
      {
        id: "00000000-0000-0000-0000-000000000303",
        firstName: "Sophie",
        lastName: "Roux",
        phone: "+41 79 400 00 04",
        email: "sophie.roux@example.ch",
        address: "Kramgasse 7, 3011 Bern",
        licenseNumber: "CH-4567890",
        licenseCategory: "B",
      },
      {
        id: "00000000-0000-0000-0000-000000000304",
        firstName: "Lucas",
        lastName: "Favre",
        phone: "+41 79 500 00 05",
        email: "lucas.favre@example.ch",
        address: "Place du Port 3, 2000 Neuchâtel",
        licenseNumber: "CH-5678901",
        licenseCategory: "B",
      },
      {
        id: "00000000-0000-0000-0000-000000000305",
        firstName: "Emma",
        lastName: "Muller",
        phone: "+41 79 600 00 06",
        email: "emma.muller@example.ch",
        address: "Rue du Rhône 25, 1950 Sion",
        licenseNumber: "CH-6789012",
        licenseCategory: "B",
      },
      {
        id: "00000000-0000-0000-0000-000000000306",
        firstName: "Antoine",
        lastName: "Leclerc",
        phone: "+41 79 700 00 07",
        email: "antoine.leclerc@example.ch",
        address: "Rue Centrale 14, 1700 Fribourg",
        licenseNumber: "CH-7890123",
        licenseCategory: "B",
        companyName: "Leclerc Transport SA",
      },
    ];

    for (const c of clientData) {
      await db
        .insert(clients)
        .values({ ...c, tenantId })
        .onConflictDoNothing();
    }

    console.log("✓ Clients seeded (7)");
    console.log("\n✅ Seed completed successfully!");
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
