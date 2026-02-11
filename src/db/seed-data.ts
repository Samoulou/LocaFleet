import { z } from "zod";

// ============================================================================
// Seed Data Constants — LocaFleet Demo
// Standalone module: no DB imports, safe to import in tests
// ============================================================================

// ── Tenant ──────────────────────────────────────────────────────────────────

export const SEED_TENANT = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "LocaFleet Demo",
  slug: "demo",
  address: "Rue du Marché 12, 1204 Genève",
  phone: "+41 22 123 45 67",
  email: "contact@locafleet.ch",
} as const;

// ── Users ───────────────────────────────────────────────────────────────────

export const SEED_USERS = [
  {
    id: "00000000-0000-0000-0000-000000000010",
    email: "admin@locafleet.ch",
    name: "Admin LocaFleet",
    role: "admin" as const,
  },
  {
    id: "00000000-0000-0000-0000-000000000011",
    email: "agent@locafleet.ch",
    name: "Agent LocaFleet",
    role: "agent" as const,
  },
  {
    id: "00000000-0000-0000-0000-000000000012",
    email: "viewer@locafleet.ch",
    name: "Viewer LocaFleet",
    role: "viewer" as const,
  },
] as const;

// ── Vehicle Categories ──────────────────────────────────────────────────────

export const SEED_CATEGORIES = [
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
] as const;

// ── Vehicles ────────────────────────────────────────────────────────────────

export const SEED_VEHICLES = [
  {
    id: "00000000-0000-0000-0000-000000000200",
    categoryId: SEED_CATEGORIES[0].id,
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
    categoryId: SEED_CATEGORIES[0].id,
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
    categoryId: SEED_CATEGORIES[1].id,
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
    categoryId: SEED_CATEGORIES[1].id,
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
    categoryId: SEED_CATEGORIES[2].id,
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
    categoryId: SEED_CATEGORIES[2].id,
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
    categoryId: SEED_CATEGORIES[3].id,
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
    categoryId: SEED_CATEGORIES[3].id,
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
] as const;

// ── Clients ─────────────────────────────────────────────────────────────────

export const SEED_CLIENTS = [
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
] as const;

// ── Default passwords (dev-only) ────────────────────────────────────────────

export const DEFAULT_SEED_PASSWORD = "Admin123!";

// ============================================================================
// Zod Schemas
// ============================================================================

export const seedTenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email(),
});

export const seedUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "agent", "viewer"]),
});

const decimalString = z.string().regex(/^\d+\.\d{2}$/);

export const seedCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  dailyRate: decimalString,
  weeklyRate: decimalString,
  sortOrder: z.number().int().positive(),
});

export const seedVehicleSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(2000),
  color: z.string().min(1),
  plateNumber: z.string().min(1),
  mileage: z.number().int().nonnegative(),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid"]),
  transmission: z.enum(["manual", "automatic"]),
  status: z.enum(["available", "rented", "maintenance", "out_of_service"]),
});

export const seedClientSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  address: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseCategory: z.string().optional(),
  companyName: z.string().optional(),
});

export const seedConfigSchema = z.object({
  tenant: seedTenantSchema,
  users: z.array(seedUserSchema).min(1),
  categories: z.array(seedCategorySchema).min(1),
  vehicles: z.array(seedVehicleSchema),
  clients: z.array(seedClientSchema),
});

export type SeedConfig = z.infer<typeof seedConfigSchema>;
