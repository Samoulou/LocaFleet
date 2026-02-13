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
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Documents</h2>

      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Aucun document</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
              >
                <FileText className="size-5 text-slate-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {doc.label ?? DOC_TYPE_LABELS[doc.type] ?? doc.type}
                  </p>
                  {doc.fileName && (
                    <p className="text-xs text-slate-500">{doc.fileName}</p>
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
