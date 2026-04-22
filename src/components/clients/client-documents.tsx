import { FileText } from "lucide-react";
import type { ClientDocument } from "@/actions/clients";

type ClientDocumentsProps = {
  documents: ClientDocument[];
};

const DOC_TYPE_LABELS: Record<string, string> = {
  driving_license: "Permis de conduire",
  identity_card: "Carte d'identite",
  proof_of_address: "Justificatif de domicile",
  other: "Autre",
};

export function ClientDocuments({ documents }: ClientDocumentsProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-6">
      <h2 className="text-lg font-semibold text-foreground">Documents</h2>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Aucun document</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted"
              >
                <FileText className="size-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {doc.label ?? DOC_TYPE_LABELS[doc.type] ?? doc.type}
                  </p>
                  {doc.fileName && (
                    <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
