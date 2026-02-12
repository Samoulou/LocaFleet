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

// ── Rental Contracts (completed — billing simulation) ──────────────────────

export const SEED_CONTRACTS = [
  {
    id: "00000000-0000-0000-0000-000000000400",
    contractNumber: "CTR-2026-S001",
    clientId: SEED_CLIENTS[0].id, // Jean Dupont
    vehicleId: SEED_VEHICLES[0].id, // Renault Clio
    createdByUserId: SEED_USERS[1].id, // Agent
    status: "completed" as const,
    startDate: "2026-01-05T08:00:00.000Z",
    endDate: "2026-01-08T08:00:00.000Z",
    actualReturnDate: "2026-01-08T10:30:00.000Z",
    pickupLocation: "Agence Genève Centre",
    returnLocation: "Agence Genève Centre",
    departureMileage: 15200,
    returnMileage: 15500,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "45.00",
    totalDays: 3,
    baseAmount: "135.00",
    optionsAmount: "0.00",
    excessKmAmount: "0.00",
    damagesAmount: "0.00",
    totalAmount: "135.00",
    depositAmount: "200.00",
    depositStatus: "returned" as const,
    depositReturnedAmount: "200.00",
    depositReturnedDate: "2026-01-08T11:00:00.000Z",
    termsAccepted: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000401",
    contractNumber: "CTR-2026-S002",
    clientId: SEED_CLIENTS[1].id, // Marie Martin
    vehicleId: SEED_VEHICLES[1].id, // Peugeot 208
    createdByUserId: SEED_USERS[1].id,
    status: "completed" as const,
    startDate: "2026-01-10T08:00:00.000Z",
    endDate: "2026-01-15T08:00:00.000Z",
    actualReturnDate: "2026-01-15T09:00:00.000Z",
    pickupLocation: "Agence Genève Centre",
    returnLocation: "Agence Genève Centre",
    departureMileage: 28400,
    returnMileage: 29200,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "45.00",
    totalDays: 5,
    baseAmount: "225.00",
    optionsAmount: "0.00",
    excessKmAmount: "0.00",
    damagesAmount: "0.00",
    totalAmount: "225.00",
    depositAmount: "200.00",
    depositStatus: "returned" as const,
    depositReturnedAmount: "200.00",
    depositReturnedDate: "2026-01-15T10:00:00.000Z",
    termsAccepted: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000402",
    contractNumber: "CTR-2026-S003",
    clientId: SEED_CLIENTS[2].id, // Pierre Bernard
    vehicleId: SEED_VEHICLES[2].id, // VW Passat
    createdByUserId: SEED_USERS[0].id, // Admin
    status: "completed" as const,
    startDate: "2026-01-06T08:00:00.000Z",
    endDate: "2026-01-13T08:00:00.000Z",
    actualReturnDate: "2026-01-13T14:00:00.000Z",
    pickupLocation: "Agence Genève Aéroport",
    returnLocation: "Agence Genève Aéroport",
    departureMileage: 12800,
    returnMileage: 14400,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "65.00",
    totalDays: 7,
    baseAmount: "455.00",
    optionsAmount: "0.00",
    excessKmAmount: "70.00",
    damagesAmount: "0.00",
    totalAmount: "525.00",
    depositAmount: "500.00",
    depositStatus: "returned" as const,
    depositReturnedAmount: "500.00",
    depositReturnedDate: "2026-01-13T15:00:00.000Z",
    termsAccepted: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000403",
    contractNumber: "CTR-2026-S004",
    clientId: SEED_CLIENTS[3].id, // Sophie Roux
    vehicleId: SEED_VEHICLES[3].id, // BMW Série 3
    createdByUserId: SEED_USERS[1].id,
    status: "completed" as const,
    startDate: "2026-01-20T08:00:00.000Z",
    endDate: "2026-01-24T08:00:00.000Z",
    actualReturnDate: "2026-01-24T11:00:00.000Z",
    pickupLocation: "Agence Genève Centre",
    returnLocation: "Agence Genève Centre",
    departureMileage: 35600,
    returnMileage: 36200,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "65.00",
    totalDays: 4,
    baseAmount: "260.00",
    optionsAmount: "0.00",
    excessKmAmount: "0.00",
    damagesAmount: "0.00",
    totalAmount: "260.00",
    depositAmount: "500.00",
    depositStatus: "returned" as const,
    depositReturnedAmount: "500.00",
    depositReturnedDate: "2026-01-24T12:00:00.000Z",
    termsAccepted: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000404",
    contractNumber: "CTR-2026-S005",
    clientId: SEED_CLIENTS[4].id, // Lucas Favre
    vehicleId: SEED_VEHICLES[4].id, // Toyota RAV4
    createdByUserId: SEED_USERS[1].id,
    status: "completed" as const,
    startDate: "2026-01-25T08:00:00.000Z",
    endDate: "2026-01-28T08:00:00.000Z",
    actualReturnDate: "2026-01-28T16:00:00.000Z",
    pickupLocation: "Agence Genève Centre",
    returnLocation: "Agence Genève Centre",
    departureMileage: 5200,
    returnMileage: 5750,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "85.00",
    totalDays: 3,
    baseAmount: "255.00",
    optionsAmount: "0.00",
    excessKmAmount: "0.00",
    damagesAmount: "150.00",
    totalAmount: "405.00",
    depositAmount: "800.00",
    depositStatus: "partially_returned" as const,
    depositReturnedAmount: "650.00",
    depositReturnedDate: "2026-01-30T10:00:00.000Z",
    termsAccepted: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000405",
    contractNumber: "CTR-2026-S006",
    clientId: SEED_CLIENTS[5].id, // Emma Muller
    vehicleId: SEED_VEHICLES[5].id, // Audi Q5
    createdByUserId: SEED_USERS[0].id,
    status: "completed" as const,
    startDate: "2026-01-15T08:00:00.000Z",
    endDate: "2026-01-25T08:00:00.000Z",
    actualReturnDate: "2026-01-25T09:00:00.000Z",
    pickupLocation: "Agence Genève Aéroport",
    returnLocation: "Agence Genève Aéroport",
    departureMileage: 18900,
    returnMileage: 20100,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "85.00",
    totalDays: 10,
    baseAmount: "850.00",
    optionsAmount: "0.00",
    excessKmAmount: "0.00",
    damagesAmount: "0.00",
    totalAmount: "850.00",
    depositAmount: "800.00",
    depositStatus: "returned" as const,
    depositReturnedAmount: "800.00",
    depositReturnedDate: "2026-01-25T10:00:00.000Z",
    termsAccepted: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000406",
    contractNumber: "CTR-2026-S007",
    clientId: SEED_CLIENTS[6].id, // Antoine Leclerc
    vehicleId: SEED_VEHICLES[6].id, // Renault Kangoo
    createdByUserId: SEED_USERS[1].id,
    status: "completed" as const,
    startDate: "2026-02-01T08:00:00.000Z",
    endDate: "2026-02-03T08:00:00.000Z",
    actualReturnDate: "2026-02-03T10:00:00.000Z",
    pickupLocation: "Agence Genève Centre",
    returnLocation: "Agence Genève Centre",
    departureMileage: 22100,
    returnMileage: 22400,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "75.00",
    totalDays: 2,
    baseAmount: "150.00",
    optionsAmount: "0.00",
    excessKmAmount: "0.00",
    damagesAmount: "0.00",
    totalAmount: "150.00",
    depositAmount: "300.00",
    depositStatus: "returned" as const,
    depositReturnedAmount: "300.00",
    depositReturnedDate: "2026-02-03T11:00:00.000Z",
    termsAccepted: true,
  },
  {
    id: "00000000-0000-0000-0000-000000000407",
    contractNumber: "CTR-2026-S008",
    clientId: SEED_CLIENTS[0].id, // Jean Dupont (repeat client)
    vehicleId: SEED_VEHICLES[7].id, // Citroën Berlingo
    createdByUserId: SEED_USERS[0].id,
    status: "completed" as const,
    startDate: "2026-02-05T08:00:00.000Z",
    endDate: "2026-02-08T08:00:00.000Z",
    actualReturnDate: "2026-02-08T09:30:00.000Z",
    pickupLocation: "Agence Genève Centre",
    returnLocation: "Agence Genève Centre",
    departureMileage: 41300,
    returnMileage: 41700,
    includedKmPerDay: 200,
    excessKmRate: "0.35",
    dailyRate: "75.00",
    totalDays: 3,
    baseAmount: "225.00",
    optionsAmount: "0.00",
    excessKmAmount: "0.00",
    damagesAmount: "0.00",
    totalAmount: "225.00",
    depositAmount: "300.00",
    depositStatus: "returned" as const,
    depositReturnedAmount: "300.00",
    depositReturnedDate: "2026-02-08T10:00:00.000Z",
    termsAccepted: true,
  },
];

// ── Invoices (all 6 statuses) ──────────────────────────────────────────────

export const SEED_INVOICES = [
  {
    id: "00000000-0000-0000-0000-000000000500",
    contractId: SEED_CONTRACTS[0].id,
    clientId: SEED_CLIENTS[0].id, // Jean Dupont
    invoiceNumber: "FAC-2026-0001",
    status: "pending" as const,
    subtotal: "135.00",
    taxRate: "0.00",
    taxAmount: "0.00",
    totalAmount: "135.00",
    lineItems: [
      {
        description: "Location Renault Clio (3 jours × 45.00 CHF/jour)",
        quantity: 3,
        unitPrice: "45.00",
        totalPrice: "135.00",
        type: "base_rental" as const,
      },
    ],
    issuedAt: "2026-01-08T11:00:00.000Z",
    dueDate: "2026-02-07",
  },
  {
    id: "00000000-0000-0000-0000-000000000501",
    contractId: SEED_CONTRACTS[1].id,
    clientId: SEED_CLIENTS[1].id, // Marie Martin
    invoiceNumber: "FAC-2026-0002",
    status: "invoiced" as const,
    subtotal: "225.00",
    taxRate: "0.00",
    taxAmount: "0.00",
    totalAmount: "225.00",
    lineItems: [
      {
        description: "Location Peugeot 208 (5 jours × 45.00 CHF/jour)",
        quantity: 5,
        unitPrice: "45.00",
        totalPrice: "225.00",
        type: "base_rental" as const,
      },
    ],
    issuedAt: "2026-01-15T10:00:00.000Z",
    dueDate: "2026-02-14",
  },
  {
    id: "00000000-0000-0000-0000-000000000502",
    contractId: SEED_CONTRACTS[2].id,
    clientId: SEED_CLIENTS[2].id, // Pierre Bernard
    invoiceNumber: "FAC-2026-0003",
    status: "verification" as const,
    subtotal: "525.00",
    taxRate: "0.00",
    taxAmount: "0.00",
    totalAmount: "525.00",
    lineItems: [
      {
        description: "Location VW Passat (7 jours × 65.00 CHF/jour)",
        quantity: 7,
        unitPrice: "65.00",
        totalPrice: "455.00",
        type: "base_rental" as const,
      },
      {
        description: "Kilomètres supplémentaires (200 km × 0.35 CHF/km)",
        quantity: 200,
        unitPrice: "0.35",
        totalPrice: "70.00",
        type: "excess_km" as const,
      },
    ],
    issuedAt: "2026-01-13T15:00:00.000Z",
    dueDate: "2026-02-12",
  },
  {
    id: "00000000-0000-0000-0000-000000000503",
    contractId: SEED_CONTRACTS[3].id,
    clientId: SEED_CLIENTS[3].id, // Sophie Roux
    invoiceNumber: "FAC-2026-0004",
    status: "paid" as const,
    subtotal: "260.00",
    taxRate: "0.00",
    taxAmount: "0.00",
    totalAmount: "260.00",
    lineItems: [
      {
        description: "Location BMW Série 3 (4 jours × 65.00 CHF/jour)",
        quantity: 4,
        unitPrice: "65.00",
        totalPrice: "260.00",
        type: "base_rental" as const,
      },
    ],
    issuedAt: "2026-01-24T12:00:00.000Z",
    dueDate: "2026-02-23",
  },
  {
    id: "00000000-0000-0000-0000-000000000504",
    contractId: SEED_CONTRACTS[4].id,
    clientId: SEED_CLIENTS[4].id, // Lucas Favre
    invoiceNumber: "FAC-2026-0005",
    status: "conflict" as const,
    subtotal: "405.00",
    taxRate: "0.00",
    taxAmount: "0.00",
    totalAmount: "405.00",
    lineItems: [
      {
        description: "Location Toyota RAV4 (3 jours × 85.00 CHF/jour)",
        quantity: 3,
        unitPrice: "85.00",
        totalPrice: "255.00",
        type: "base_rental" as const,
      },
      {
        description: "Franchise dégâts",
        quantity: 1,
        unitPrice: "150.00",
        totalPrice: "150.00",
        type: "damages" as const,
      },
    ],
    issuedAt: "2026-01-28T16:00:00.000Z",
    dueDate: "2026-02-27",
    notes:
      "Contestation du client concernant la franchise dégâts — montant des dommages remis en question",
  },
  {
    id: "00000000-0000-0000-0000-000000000505",
    contractId: SEED_CONTRACTS[5].id,
    clientId: SEED_CLIENTS[5].id, // Emma Muller
    invoiceNumber: "FAC-2026-0006",
    status: "cancelled" as const,
    subtotal: "850.00",
    taxRate: "0.00",
    taxAmount: "0.00",
    totalAmount: "850.00",
    lineItems: [
      {
        description: "Location Audi Q5 (10 jours × 85.00 CHF/jour)",
        quantity: 10,
        unitPrice: "85.00",
        totalPrice: "850.00",
        type: "base_rental" as const,
      },
    ],
    issuedAt: "2026-01-25T10:00:00.000Z",
    dueDate: "2026-02-24",
    notes: "Erreur de facturation — facture annulée et refaite",
  },
  {
    id: "00000000-0000-0000-0000-000000000506",
    contractId: SEED_CONTRACTS[7].id,
    clientId: SEED_CLIENTS[0].id, // Jean Dupont (repeat)
    invoiceNumber: "FAC-2026-0007",
    status: "paid" as const,
    subtotal: "225.00",
    taxRate: "0.00",
    taxAmount: "0.00",
    totalAmount: "225.00",
    lineItems: [
      {
        description: "Location Citroën Berlingo (3 jours × 75.00 CHF/jour)",
        quantity: 3,
        unitPrice: "75.00",
        totalPrice: "225.00",
        type: "base_rental" as const,
      },
    ],
    issuedAt: "2026-02-08T10:00:00.000Z",
    dueDate: "2026-03-10",
  },
];

// ── Payments ───────────────────────────────────────────────────────────────

export const SEED_PAYMENTS = [
  {
    id: "00000000-0000-0000-0000-000000000600",
    invoiceId: SEED_INVOICES[2].id, // FAC-2026-0003 (verification)
    processedByUserId: SEED_USERS[0].id, // Admin
    amount: "525.00",
    method: "invoice" as const,
    reference: "VIR-2026-00341",
    paidAt: "2026-01-20T14:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000601",
    invoiceId: SEED_INVOICES[3].id, // FAC-2026-0004 (paid)
    processedByUserId: SEED_USERS[1].id, // Agent
    amount: "260.00",
    method: "cash_departure" as const,
    reference: "CASH-2026-00112",
    paidAt: "2026-01-26T10:00:00.000Z",
  },
  {
    id: "00000000-0000-0000-0000-000000000602",
    invoiceId: SEED_INVOICES[4].id, // FAC-2026-0005 (conflict)
    processedByUserId: SEED_USERS[1].id,
    amount: "255.00",
    method: "card" as const,
    reference: "CB-2026-00089",
    paidAt: "2026-02-02T11:00:00.000Z",
    notes: "Paiement partiel — franchise dégâts contestée par le client",
  },
  {
    id: "00000000-0000-0000-0000-000000000603",
    invoiceId: SEED_INVOICES[6].id, // FAC-2026-0007 (paid)
    processedByUserId: SEED_USERS[0].id,
    amount: "225.00",
    method: "bank_transfer" as const,
    reference: "VIR-2026-00387",
    paidAt: "2026-02-10T09:00:00.000Z",
  },
];

// ── Rental Dossiers (all 5 statuses) ───────────────────────────────────────

export const SEED_DOSSIERS = [
  {
    id: "00000000-0000-0000-0000-000000000700",
    contractId: SEED_CONTRACTS[6].id, // CTR-2026-S007 (Leclerc, Kangoo)
    invoiceId: null,
    dossierNumber: "DOS-2026-0001",
    status: "open" as const,
    clientName: "Antoine Leclerc",
    vehicleInfo: "Renault Kangoo (GE 789 012)",
    rentalPeriod: "01.02.2026 — 03.02.2026",
    totalAmount: "150.00",
  },
  {
    id: "00000000-0000-0000-0000-000000000701",
    contractId: SEED_CONTRACTS[0].id, // CTR-2026-S001 (Dupont, Clio)
    invoiceId: SEED_INVOICES[0].id, // FAC-2026-0001 (pending)
    dossierNumber: "DOS-2026-0002",
    status: "to_invoice" as const,
    clientName: "Jean Dupont",
    vehicleInfo: "Renault Clio (GE 123 456)",
    rentalPeriod: "05.01.2026 — 08.01.2026",
    totalAmount: "135.00",
  },
  {
    id: "00000000-0000-0000-0000-000000000702",
    contractId: SEED_CONTRACTS[1].id, // CTR-2026-S002 (Martin, 208)
    invoiceId: SEED_INVOICES[1].id, // FAC-2026-0002 (invoiced)
    dossierNumber: "DOS-2026-0003",
    status: "invoiced" as const,
    clientName: "Marie Martin",
    vehicleInfo: "Peugeot 208 (GE 234 567)",
    rentalPeriod: "10.01.2026 — 15.01.2026",
    totalAmount: "225.00",
  },
  {
    id: "00000000-0000-0000-0000-000000000703",
    contractId: SEED_CONTRACTS[3].id, // CTR-2026-S004 (Roux, BMW)
    invoiceId: SEED_INVOICES[3].id, // FAC-2026-0004 (paid)
    dossierNumber: "DOS-2026-0004",
    status: "paid" as const,
    clientName: "Sophie Roux",
    vehicleInfo: "BMW Série 3 (GE 456 789)",
    rentalPeriod: "20.01.2026 — 24.01.2026",
    totalAmount: "260.00",
  },
  {
    id: "00000000-0000-0000-0000-000000000704",
    contractId: SEED_CONTRACTS[7].id, // CTR-2026-S008 (Dupont, Berlingo)
    invoiceId: SEED_INVOICES[6].id, // FAC-2026-0007 (paid)
    dossierNumber: "DOS-2026-0005",
    status: "archived" as const,
    clientName: "Jean Dupont",
    vehicleInfo: "Citroën Berlingo (GE 890 123)",
    rentalPeriod: "05.02.2026 — 08.02.2026",
    totalAmount: "225.00",
    archivedAt: "2026-02-10T14:00:00.000Z",
  },
];

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

export const seedContractSchema = z.object({
  id: z.string().uuid(),
  contractNumber: z.string().min(1),
  clientId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  createdByUserId: z.string().uuid(),
  status: z.enum(["draft", "active", "completed", "cancelled"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalDays: z.number().int().positive(),
  dailyRate: decimalString,
  baseAmount: decimalString,
  totalAmount: decimalString,
});

export const seedInvoiceSchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid(),
  clientId: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  status: z.enum([
    "pending",
    "invoiced",
    "verification",
    "paid",
    "conflict",
    "cancelled",
  ]),
  totalAmount: decimalString,
});

export const seedPaymentSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: decimalString,
  method: z.enum(["cash", "card", "bank_transfer"]),
});

export const seedDossierSchema = z.object({
  id: z.string().uuid(),
  contractId: z.string().uuid(),
  dossierNumber: z.string().min(1),
  status: z.enum(["open", "to_invoice", "invoiced", "paid", "archived"]),
  totalAmount: decimalString,
});

export const seedConfigSchema = z.object({
  tenant: seedTenantSchema,
  users: z.array(seedUserSchema).min(1),
  categories: z.array(seedCategorySchema).min(1),
  vehicles: z.array(seedVehicleSchema),
  clients: z.array(seedClientSchema),
  contracts: z.array(seedContractSchema).optional(),
  invoices: z.array(seedInvoiceSchema).optional(),
  payments: z.array(seedPaymentSchema).optional(),
  dossiers: z.array(seedDossierSchema).optional(),
});

export type SeedConfig = z.infer<typeof seedConfigSchema>;
