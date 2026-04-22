"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Pencil,
  BadgeCheck,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  BarChart3,
  Building2,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientAvatar } from "@/components/clients/client-avatar";
import { ClientContractsHistory } from "@/components/clients/client-contracts-history";
import { ClientDocuments } from "@/components/clients/client-documents";
import { EditClientSheet } from "@/components/clients/edit-client-sheet";
import { formatDate } from "@/lib/utils";
import type {
  ClientDetail,
  ClientDocument as ClientDocumentType,
  ContractSummary,
} from "@/actions/clients";

type ClientDetailContentProps = {
  client: ClientDetail;
  documents: ClientDocumentType[];
  contracts: ContractSummary[];
};

export function ClientDetailContent({
  client,
  documents,
  contracts,
}: ClientDetailContentProps) {
  const t = useTranslations("clients.detail");
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  const activeContracts = contracts.filter((c) => c.status === "active").length;

  return (
    <>
      {/* Header: Avatar + Name + Badge + Edit */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <ClientAvatar
            firstName={client.firstName}
            lastName={client.lastName}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                {client.firstName} {client.lastName}
              </h1>
              {client.isTrusted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                  <BadgeCheck className="size-3" />
                  {t("trustedToggle")}
                </span>
              )}
            </div>
            {client.companyName && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                <Building2 className="mr-1 inline size-3.5" />
                {client.companyName}
              </p>
            )}
            <p className="mt-0.5 text-sm text-muted-foreground">
              {client.email} &middot; {client.phone}
            </p>
          </div>
        </div>
        <Button onClick={() => setEditSheetOpen(true)}>
          <Pencil className="mr-2 size-4" />
          {t("info") === "Informations" ? "Modifier" : "Edit"}
        </Button>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Mail className="size-4 text-muted-foreground" />
            {t("cardInfo")}
          </h3>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t("email")}</dt>
              <dd className="text-sm text-foreground">{client.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("phone")}</dt>
              <dd className="text-sm text-foreground">{client.phone}</dd>
            </div>
            {client.address && (
              <div>
                <dt className="text-xs text-muted-foreground">
                  <MapPin className="mr-1 inline size-3" />
                  {t("address")}
                </dt>
                <dd className="text-sm text-foreground">{client.address}</dd>
              </div>
            )}
            {client.dateOfBirth && (
              <div>
                <dt className="text-xs text-muted-foreground">{t("dateOfBirth")}</dt>
                <dd className="text-sm text-foreground">
                  {formatDate(client.dateOfBirth)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Card 2: License & Documents */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="size-4 text-muted-foreground" />
            {t("cardLicenseDocs")}
          </h3>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t("license")}</dt>
              <dd className="text-sm text-foreground">
                {client.licenseNumber ?? (
                  <span className="text-muted-foreground">{t("notSpecified")}</span>
                )}
              </dd>
            </div>
            {client.licenseCategory && (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("licenseCategory")}
                </dt>
                <dd className="text-sm text-foreground">
                  {client.licenseCategory}
                </dd>
              </div>
            )}
            {client.licenseExpiry && (
              <div>
                <dt className="text-xs text-muted-foreground">{t("licenseExpiry")}</dt>
                <dd className="text-sm text-foreground">
                  {formatDate(client.licenseExpiry)}
                </dd>
              </div>
            )}
            {client.identityDocType && (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("identityDocType")}
                </dt>
                <dd className="text-sm text-foreground">
                  {client.identityDocType}
                  {client.identityDocNumber && ` — ${client.identityDocNumber}`}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Card 3: Stats */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 className="size-4 text-muted-foreground" />
            {t("cardStats")}
          </h3>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t("totalContracts")}</dt>
              <dd className="text-sm font-medium text-foreground">
                {contracts.length}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("activeContracts")}</dt>
              <dd className="text-sm font-medium text-foreground">
                {activeContracts}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("memberSince")}</dt>
              <dd className="text-sm text-foreground">
                <Calendar className="mr-1 inline size-3" />
                {formatDate(client.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("documents")}</dt>
              <dd className="text-sm font-medium text-foreground">
                <FileText className="mr-1 inline size-3" />
                {documents.length}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Tabs: Contracts, Documents, Notes */}
      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">{t("tabContracts")}</TabsTrigger>
          <TabsTrigger value="documents">{t("tabDocuments")}</TabsTrigger>
          <TabsTrigger value="notes">{t("tabNotes")}</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="mt-4">
          <ClientContractsHistory contracts={contracts} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <ClientDocuments documents={documents} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold text-foreground">
              {t("tabNotes")}
            </h2>
            {client.notes ? (
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                {client.notes}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{t("notSpecified")}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Sheet */}
      <EditClientSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        defaultValues={client}
        clientId={client.id}
      />
    </>
  );
}
