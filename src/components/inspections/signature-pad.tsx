"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eraser } from "lucide-react";

export type SignaturePadHandle = {
  getSignatureDataUrl: () => string | undefined;
};

type SignaturePadProps = {
  existingSignatureUrl?: string | null;
  disabled?: boolean;
  required?: boolean;
  onSignatureChange?: (isEmpty: boolean) => void;
  error?: boolean;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad(
    { existingSignatureUrl, disabled, required, onSignatureChange, error },
    ref
  ) {
    const t = useTranslations("inspections.departure");
    const sigRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      getSignatureDataUrl: () => {
        if (!sigRef.current) return undefined;
        if (sigRef.current.isEmpty()) {
          return existingSignatureUrl ?? undefined;
        }
        return sigRef.current.toDataURL("image/png");
      },
    }));

    useEffect(() => {
      if (existingSignatureUrl && sigRef.current) {
        sigRef.current.fromDataURL(existingSignatureUrl, {
          ratio: 1,
          width: 500,
          height: 200,
        });
      }
    }, [existingSignatureUrl]);

    function handleClear() {
      sigRef.current?.clear();
      onSignatureChange?.(true);
    }

    function handleEnd() {
      if (!sigRef.current) return;
      onSignatureChange?.(sigRef.current.isEmpty());
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {t("clientSignature")}
            {required ? (
              <span className="ml-1 text-xs font-normal text-red-600">
                * {t("required")}
              </span>
            ) : (
              <span className="ml-1 text-xs font-normal text-slate-400">
                ({t("optional")})
              </span>
            )}
          </span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <Eraser className="mr-1 size-3.5" />
              {t("clearSignature")}
            </Button>
          )}
        </div>
        <div
          className={cn(
            "rounded-lg border bg-white",
            error ? "border-red-300" : "border-slate-200"
          )}
        >
          <SignatureCanvas
            ref={sigRef}
            onEnd={handleEnd}
            canvasProps={{
              className: "w-full h-[200px] rounded-lg",
              style: {
                width: "100%",
                height: "200px",
                pointerEvents: disabled ? "none" : "auto",
              },
            }}
            penColor="#1e293b"
          />
        </div>
      </div>
    );
  }
);
