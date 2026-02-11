"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { processPayment } from "@/actions/payments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PaymentDialogProps = {
  invoiceId: string;
  invoiceAmount: number;
  disabled?: boolean;
};

export function PaymentDialog({
  invoiceId,
  invoiceAmount,
  disabled,
}: PaymentDialogProps) {
  const t = useTranslations("payments.process");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState(invoiceAmount.toString());
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function resetForm() {
    setPaidAt(new Date().toISOString().split("T")[0]);
    setAmount(invoiceAmount.toString());
    setMethod("");
    setReference("");
    setNotes("");
    setError(null);
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const result = await processPayment({
        invoiceId,
        amount,
        method,
        paidAt,
        reference: reference || "",
        notes: notes || "",
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      toast.success(t("success"));
      setOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <CreditCard className="mr-1.5 size-3.5" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date du paiement */}
          <div className="space-y-2">
            <Label>{t("paidAt")}</Label>
            <Input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          {/* Montant */}
          <div className="space-y-2">
            <Label>{t("amount")}</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Moyen de paiement */}
          <div className="space-y-2">
            <Label>{t("method")}</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue placeholder={t("methodPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t("methods.cash")}</SelectItem>
                <SelectItem value="card">{t("methods.card")}</SelectItem>
                <SelectItem value="bank_transfer">
                  {t("methods.bank_transfer")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Référence */}
          <div className="space-y-2">
            <Label>{t("reference")}</Label>
            <Input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t("referencePlaceholder")}
              maxLength={255}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              maxLength={2000}
              rows={3}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submitButton")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
