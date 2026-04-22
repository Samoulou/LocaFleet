import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register a standard font
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica", fontWeight: "normal" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#555",
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    backgroundColor: "#f0f0f0",
    padding: 4,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    marginBottom: 3,
  },
  label: {
    width: 120,
    color: "#555",
  },
  value: {
    flex: 1,
    fontWeight: "bold",
  },
  twoCol: {
    flexDirection: "row",
    gap: 20,
  },
  col: {
    flex: 1,
  },
  table: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 4,
  },
  tableHeader: {
    backgroundColor: "#f8f8f8",
    fontWeight: "bold",
  },
  tableCell: {
    flex: 2,
    paddingRight: 4,
  },
  tableCellNum: {
    flex: 1,
    textAlign: "right",
    paddingRight: 4,
  },
  tableCellRight: {
    flex: 1,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#000",
    marginTop: 4,
    paddingTop: 6,
  },
  totalLabel: {
    flex: 5,
    textAlign: "right",
    fontWeight: "bold",
  },
  totalValue: {
    flex: 1,
    textAlign: "right",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#888",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 6,
  },
  signatureArea: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: 200,
    borderTopWidth: 1,
    borderTopColor: "#000",
    paddingTop: 4,
    marginTop: 40,
  },
});

export type ContractPdfData = {
  contractNumber: string;
  createdAt: string;
  tenantName?: string;
  tenantAddress?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string | null;
    licenseNumber?: string | null;
    companyName?: string | null;
  };
  vehicle: {
    brand: string;
    model: string;
    plateNumber: string;
    year?: number | null;
    color?: string | null;
    vin?: string | null;
  };
  rental: {
    startDate: string;
    endDate: string;
    totalDays: number;
    pickupLocation?: string | null;
    returnLocation?: string | null;
  };
  pricing: {
    dailyRate: number;
    baseAmount: number;
    options: Array<{
      name: string;
      quantity: number;
      dailyPrice: number;
      totalPrice: number;
    }>;
    optionsAmount: number;
    totalAmount: number;
    depositAmount: number | null;
  };
  paymentMethod?: string | null;
  notes?: string | null;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-CH", {
    style: "currency",
    currency: "CHF",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function ContractPdfDocument({ data }: { data: ContractPdfData }) {
  const paymentMethodLabels: Record<string, string> = {
    cash_departure: "Espèces au départ",
    cash_return: "Espèces au retour",
    invoice: "Facture",
    card: "Carte bancaire",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>CONTRAT DE LOCATION</Text>
            <Text style={styles.subtitle}>N° {data.contractNumber}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>{data.tenantName ?? "LocaFleet"}</Text>
            <Text style={{ color: "#555" }}>
              {data.tenantAddress ?? ""}
            </Text>
            <Text style={{ color: "#555" }}>
              {data.tenantPhone ?? ""} {data.tenantEmail ?? ""}
            </Text>
            <Text style={{ color: "#555", marginTop: 4 }}>
              Créé le: {formatDate(data.createdAt)}
            </Text>
          </View>
        </View>

        {/* Client & Vehicle */}
        <View style={styles.twoCol}>
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionTitle}>LOCATAIRE</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Nom:</Text>
              <Text style={styles.value}>
                {data.client.firstName} {data.client.lastName}
              </Text>
            </View>
            {data.client.companyName && (
              <View style={styles.row}>
                <Text style={styles.label}>Société:</Text>
                <Text style={styles.value}>{data.client.companyName}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{data.client.email}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Téléphone:</Text>
              <Text style={styles.value}>{data.client.phone}</Text>
            </View>
            {data.client.address && (
              <View style={styles.row}>
                <Text style={styles.label}>Adresse:</Text>
                <Text style={styles.value}>{data.client.address}</Text>
              </View>
            )}
            {data.client.licenseNumber && (
              <View style={styles.row}>
                <Text style={styles.label}>Permis:</Text>
                <Text style={styles.value}>{data.client.licenseNumber}</Text>
              </View>
            )}
          </View>

          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionTitle}>VÉHICULE</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Marque / Modèle:</Text>
              <Text style={styles.value}>
                {data.vehicle.brand} {data.vehicle.model}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Immatriculation:</Text>
              <Text style={styles.value}>{data.vehicle.plateNumber}</Text>
            </View>
            {data.vehicle.year && (
              <View style={styles.row}>
                <Text style={styles.label}>Année:</Text>
                <Text style={styles.value}>{data.vehicle.year}</Text>
              </View>
            )}
            {data.vehicle.color && (
              <View style={styles.row}>
                <Text style={styles.label}>Couleur:</Text>
                <Text style={styles.value}>{data.vehicle.color}</Text>
              </View>
            )}
            {data.vehicle.vin && (
              <View style={styles.row}>
                <Text style={styles.label}>VIN:</Text>
                <Text style={styles.value}>{data.vehicle.vin}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Rental Period */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PÉRIODE DE LOCATION</Text>
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <View style={styles.row}>
                <Text style={styles.label}>Date de départ:</Text>
                <Text style={styles.value}>
                  {formatDate(data.rental.startDate)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Date de retour:</Text>
                <Text style={styles.value}>
                  {formatDate(data.rental.endDate)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Durée totale:</Text>
                <Text style={styles.value}>{data.rental.totalDays} jour(s)</Text>
              </View>
            </View>
            <View style={styles.col}>
              {data.rental.pickupLocation && (
                <View style={styles.row}>
                  <Text style={styles.label}>Lieu de départ:</Text>
                  <Text style={styles.value}>{data.rental.pickupLocation}</Text>
                </View>
              )}
              {data.rental.returnLocation && (
                <View style={styles.row}>
                  <Text style={styles.label}>Lieu de retour:</Text>
                  <Text style={styles.value}>{data.rental.returnLocation}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DÉTAIL DES FRAIS</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Description</Text>
              <Text style={styles.tableCellNum}>Qté</Text>
              <Text style={styles.tableCellRight}>Prix unit.</Text>
              <Text style={styles.tableCellRight}>Total</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>
                Location de base ({data.rental.totalDays}j ×{" "}
                {formatCurrency(data.pricing.dailyRate)})
              </Text>
              <Text style={styles.tableCellNum}>{data.rental.totalDays}</Text>
              <Text style={styles.tableCellRight}>
                {formatCurrency(data.pricing.dailyRate)}
              </Text>
              <Text style={styles.tableCellRight}>
                {formatCurrency(data.pricing.baseAmount)}
              </Text>
            </View>
            {data.pricing.options.map((opt, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{opt.name}</Text>
                <Text style={styles.tableCellNum}>{opt.quantity}</Text>
                <Text style={styles.tableCellRight}>
                  {formatCurrency(opt.dailyPrice)}
                </Text>
                <Text style={styles.tableCellRight}>
                  {formatCurrency(opt.totalPrice)}
                </Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>MONTANT TOTAL</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(data.pricing.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PAIEMENT</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Mode de paiement:</Text>
            <Text style={styles.value}>
              {data.paymentMethod
                ? paymentMethodLabels[data.paymentMethod] ?? data.paymentMethod
                : "Non spécifié"}
            </Text>
          </View>
          {data.pricing.depositAmount !== null && (
            <View style={styles.row}>
              <Text style={styles.label}>Caution:</Text>
              <Text style={styles.value}>
                {formatCurrency(data.pricing.depositAmount)}
              </Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTES</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureArea}>
          <View>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
              Signature du locataire
            </Text>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 8, color: "#888" }}>
                Lu et approuvé le {formatDate(data.createdAt)}
              </Text>
            </View>
          </View>
          <View>
            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
              Signature du loueur
            </Text>
            <View style={styles.signatureBox}>
              <Text style={{ fontSize: 8, color: "#888" }}>
                Pour {data.tenantName ?? "LocaFleet"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            Contrat N° {data.contractNumber} — Page 1 sur 1
          </Text>
          <Text>
            Ce contrat est régi par les conditions générales de location acceptées par le locataire.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
