---
name: locafleet-schema
description: >
  Complete database schema reference for LocaFleet.
  MUST be consulted before ANY database operation (query, insert, update, migration).
  Contains all 21 tables, 18 enums, relations, and indexes.
---

# LocaFleet Database Schema

## Quick Reference

@src/db/schema.ts

## Tables by Epic

### Epic 1 - Foundation
- `tenants` (id, name, slug, settings)
- `users` (id, tenantId, email, name, role, isActive)
- `sessions`, `accounts`, `verifications` (Better Auth managed)

### Epic 2 - Fleet
- `vehicles` (id, tenantId, categoryId, brand, model, plateNumber, status, mileage, fuelType...)
- `vehicle_categories` (id, tenantId, name, dailyRate, weeklyRate)
- `vehicle_photos` (id, vehicleId, url, isCover, sortOrder)
- `maintenance_records` (id, tenantId, vehicleId, type, status, urgency, mechanicEmail...)

### Epic 3 - Clients & Contracts
- `clients` (id, tenantId, firstName, lastName, phone, email, licenseNumber...)
- `client_documents` (id, clientId, type, url)
- `rental_options` (id, tenantId, name, dailyPrice, isPerDay)
- `rental_contracts` (id, tenantId, contractNumber, clientId, vehicleId, status, startDate, endDate, dailyRate, totalAmount, depositAmount, depositStatus...)
- `contract_options` (id, contractId, name, dailyPrice, totalPrice)

### Epic 4 - Inspections
- `inspections` (id, tenantId, contractId, vehicleId, type[departure|return], mileage, fuelLevel, exteriorCleanliness, interiorCleanliness, clientSignatureUrl...)
- `inspection_photos` (id, inspectionId, url, position[front|back|left|right|other])
- `inspection_damages` (id, inspectionId, zone, type, severity, isPreExisting)

### Epic 5 - Billing
- `invoices` (id, tenantId, contractId, invoiceNumber, status, totalAmount, lineItems[jsonb]...)
- `payments` (id, tenantId, invoiceId, amount, method[cash|card|bank_transfer], paidAt)
- `rental_dossiers` (id, tenantId, contractId, invoiceId, status, clientName, vehicleInfo...)

### Epic 6 - Notifications
- `email_logs` (id, tenantId, type, status, recipientEmail, subject, resendId...)
- `notifications` (id, tenantId, userId, type, title, message, isRead)

### Cross-epic
- `audit_logs` (id, tenantId, userId, action, entityType, entityId, changes[jsonb])

## Key Enums
```
vehicle_status: available | rented | maintenance | out_of_service
contract_status: draft | active | completed | cancelled
invoice_status: pending | invoiced | verification | paid | conflict | cancelled
inspection_type: departure | return
fuel_level: empty | quarter | half | three_quarter | full
damage_severity: low | medium | high
payment_method: cash | card | bank_transfer
user_role: admin | agent | viewer
```

## Critical Indexes
- `vehicles_plate_tenant_idx` - UNIQUE(plateNumber, tenantId)
- `contracts_dates_idx` - (vehicleId, startDate, endDate) for availability checks
- `contracts_number_tenant_idx` - UNIQUE(contractNumber, tenantId)
- `invoices_number_tenant_idx` - UNIQUE(invoiceNumber, tenantId)

## Common Query Patterns

### Get all vehicles for a tenant
```typescript
const vehicles = await db
  .select()
  .from(vehicles)
  .where(and(
    eq(vehicles.tenantId, tenantId),
    isNull(vehicles.deletedAt)
  ));
```

### Get vehicle with category
```typescript
const vehicle = await db.query.vehicles.findFirst({
  where: and(
    eq(vehicles.id, vehicleId),
    eq(vehicles.tenantId, tenantId)
  ),
  with: { category: true }
});
```

### Check vehicle availability
```typescript
const conflictingContracts = await db
  .select()
  .from(contracts)
  .where(and(
    eq(contracts.vehicleId, vehicleId),
    eq(contracts.tenantId, tenantId),
    not(eq(contracts.status, "cancelled")),
    lte(contracts.startDate, endDate),
    gte(contracts.endDate, startDate)
  ));
```

## Rules
1. ALWAYS include tenantId in WHERE clauses
2. Use Drizzle's `with` for eager loading relations
3. Use `returning()` for insert/update to get the created/updated record
4. Decimal fields use `{ precision: 10, scale: 2 }` - parse with parseFloat
5. Soft delete: check `deletedAt IS NULL` for vehicles and clients
6. Timestamps: always use `defaultNow()`, never set manually
