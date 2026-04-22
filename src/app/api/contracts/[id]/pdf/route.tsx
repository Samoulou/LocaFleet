import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  rentalContracts,
  clients,
  vehicles,
  vehicleCategories,
  contractOptions,
  tenants,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ContractPdfDocument, type ContractPdfData } from "@/components/contracts/contract-pdf-template";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch contract with all related data
    const [contractRow] = await db
      .select({
        id: rentalContracts.id,
        contractNumber: rentalContracts.contractNumber,
        status: rentalContracts.status,
        startDate: rentalContracts.startDate,
        endDate: rentalContracts.endDate,
        dailyRate: rentalContracts.dailyRate,
        totalDays: rentalContracts.totalDays,
        baseAmount: rentalContracts.baseAmount,
        optionsAmount: rentalContracts.optionsAmount,
        totalAmount: rentalContracts.totalAmount,
        depositAmount: rentalContracts.depositAmount,
        paymentMethod: rentalContracts.paymentMethod,
        pickupLocation: rentalContracts.pickupLocation,
        returnLocation: rentalContracts.returnLocation,
        notes: rentalContracts.notes,
        createdAt: rentalContracts.createdAt,
        tenantId: rentalContracts.tenantId,
        // Client
        clientId: clients.id,
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName,
        clientEmail: clients.email,
        clientPhone: clients.phone,
        clientAddress: clients.address,
        clientLicenseNumber: clients.licenseNumber,
        clientCompanyName: clients.companyName,
        // Vehicle
        vehicleBrand: vehicles.brand,
        vehicleModel: vehicles.model,
        vehiclePlateNumber: vehicles.plateNumber,
        vehicleYear: vehicles.year,
        vehicleColor: vehicles.color,
        vehicleVin: vehicles.vin,
      })
      .from(rentalContracts)
      .innerJoin(clients, eq(rentalContracts.clientId, clients.id))
      .innerJoin(vehicles, eq(rentalContracts.vehicleId, vehicles.id))
      .where(
        and(
          eq(rentalContracts.id, contractId),
          eq(rentalContracts.tenantId, currentUser.tenantId)
        )
      );

    if (!contractRow) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    // Fetch tenant info
    const [tenantRow] = await db
      .select({
        name: tenants.name,
        address: tenants.address,
        phone: tenants.phone,
        email: tenants.email,
      })
      .from(tenants)
      .where(eq(tenants.id, contractRow.tenantId));

    // Fetch options
    const options = await db
      .select({
        name: contractOptions.name,
        quantity: contractOptions.quantity,
        dailyPrice: contractOptions.dailyPrice,
        totalPrice: contractOptions.totalPrice,
      })
      .from(contractOptions)
      .where(eq(contractOptions.contractId, contractId));

    const pdfData: ContractPdfData = {
      contractNumber: contractRow.contractNumber,
      createdAt: contractRow.createdAt.toISOString(),
      tenantName: tenantRow?.name ?? undefined,
      tenantAddress: tenantRow?.address ?? undefined,
      tenantPhone: tenantRow?.phone ?? undefined,
      tenantEmail: tenantRow?.email ?? undefined,
      client: {
        firstName: contractRow.clientFirstName,
        lastName: contractRow.clientLastName,
        email: contractRow.clientEmail,
        phone: contractRow.clientPhone,
        address: contractRow.clientAddress,
        licenseNumber: contractRow.clientLicenseNumber,
        companyName: contractRow.clientCompanyName,
      },
      vehicle: {
        brand: contractRow.vehicleBrand,
        model: contractRow.vehicleModel,
        plateNumber: contractRow.vehiclePlateNumber,
        year: contractRow.vehicleYear,
        color: contractRow.vehicleColor,
        vin: contractRow.vehicleVin,
      },
      rental: {
        startDate: contractRow.startDate.toISOString(),
        endDate: contractRow.endDate.toISOString(),
        totalDays: contractRow.totalDays,
        pickupLocation: contractRow.pickupLocation,
        returnLocation: contractRow.returnLocation,
      },
      pricing: {
        dailyRate: parseFloat(contractRow.dailyRate),
        baseAmount: parseFloat(contractRow.baseAmount),
        options: options.map((o) => ({
          name: o.name,
          quantity: o.quantity ?? 1,
          dailyPrice: parseFloat(o.dailyPrice),
          totalPrice: parseFloat(o.totalPrice),
        })),
        optionsAmount: parseFloat(contractRow.optionsAmount ?? "0"),
        totalAmount: parseFloat(contractRow.totalAmount),
        depositAmount: contractRow.depositAmount
          ? parseFloat(contractRow.depositAmount)
          : null,
      },
      paymentMethod: contractRow.paymentMethod,
      notes: contractRow.notes,
    };

    const stream = await renderToStream(
      <ContractPdfDocument data={pdfData} />
    );

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="contrat-${pdfData.contractNumber}.pdf"`,
      },
    });
  } catch (err) {
    console.error(
      "PDF generation error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
