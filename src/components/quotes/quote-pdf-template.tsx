import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ============================================================================
// Types
// ============================================================================

export type QuotePdfData = {
  quoteNumber: string;
  createdAt: string;
  validUntil: string | null;
  title: string | null;
  fonctionName: string;
  tenantName?: string;
  tenantAddress?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  client: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string | null;
    companyName: string | null;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | null;
};

// ============================================================================
// Helpers — Swiss formatting (no client-side imports in PDF context)
// ============================================================================

function chf(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const [int, dec] = num.toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${grouped}.${dec} CHF`;
}

function formatDateCH(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  tenantBlock: { maxWidth: 250 },
  tenantName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  muted: { color: "#64748b" },
  titleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 110, color: "#64748b" },
  value: { flex: 1 },
  table: { marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  colDescription: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colUnit: { width: 90, textAlign: "right" },
  colTotal: { width: 90, textAlign: "right" },
  totals: { marginTop: 8, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", marginBottom: 2 },
  totalLabel: { width: 120, textAlign: "right", color: "#64748b" },
  totalValue: { width: 100, textAlign: "right" },
  grandTotal: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 6,
  },
});

// ============================================================================
// Document
// ============================================================================

export function QuotePdfDocument({ data }: { data: QuotePdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.tenantBlock}>
            <Text style={styles.tenantName}>
              {data.tenantName ?? "LocaFleet"}
            </Text>
            {data.tenantAddress && (
              <Text style={styles.muted}>{data.tenantAddress}</Text>
            )}
            {data.tenantPhone && (
              <Text style={styles.muted}>{data.tenantPhone}</Text>
            )}
            {data.tenantEmail && (
              <Text style={styles.muted}>{data.tenantEmail}</Text>
            )}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.docTitle}>OFFRE</Text>
            <Text>{data.quoteNumber}</Text>
            <Text style={styles.muted}>
              Date : {formatDateCH(data.createdAt)}
            </Text>
            {data.validUntil && (
              <Text style={styles.muted}>
                Valable jusqu&apos;au : {formatDateCH(data.validUntil)}
              </Text>
            )}
          </View>
        </View>

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nom</Text>
            <Text style={styles.value}>
              {data.client.firstName} {data.client.lastName}
              {data.client.companyName ? ` — ${data.client.companyName}` : ""}
            </Text>
          </View>
          {data.client.address && (
            <View style={styles.row}>
              <Text style={styles.label}>Adresse</Text>
              <Text style={styles.value}>{data.client.address}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Contact</Text>
            <Text style={styles.value}>
              {data.client.phone} — {data.client.email}
            </Text>
          </View>
        </View>

        {/* Prestation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prestation</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Fonction</Text>
            <Text style={styles.value}>{data.fonctionName}</Text>
          </View>
          {data.title && (
            <View style={styles.row}>
              <Text style={styles.label}>Objet</Text>
              <Text style={styles.value}>{data.title}</Text>
            </View>
          )}
          {data.period.startDate && data.period.endDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Période prévue</Text>
              <Text style={styles.value}>
                Du {formatDateCH(data.period.startDate)} au{" "}
                {formatDateCH(data.period.endDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Lines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colDescription}>Description</Text>
              <Text style={styles.colQty}>Qté</Text>
              <Text style={styles.colUnit}>Prix unitaire</Text>
              <Text style={styles.colTotal}>Total</Text>
            </View>
            {data.lineItems.map((line, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colDescription}>{line.description}</Text>
                <Text style={styles.colQty}>{line.quantity}</Text>
                <Text style={styles.colUnit}>{chf(line.unitPrice)}</Text>
                <Text style={styles.colTotal}>{chf(line.totalPrice)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total</Text>
              <Text style={styles.totalValue}>{chf(data.subtotal)}</Text>
            </View>
            {parseFloat(data.taxRate) > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TVA ({data.taxRate} %)</Text>
                <Text style={styles.totalValue}>{chf(data.taxAmount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, styles.grandTotal]}>TOTAL</Text>
              <Text style={[styles.totalValue, styles.grandTotal]}>
                {chf(data.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remarques</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {data.tenantName ?? "LocaFleet"} — Offre {data.quoteNumber} — Sauf
          mention contraire, prix en francs suisses (CHF).
        </Text>
      </Page>
    </Document>
  );
}
