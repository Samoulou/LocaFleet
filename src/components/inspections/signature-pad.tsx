"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export type SignaturePadHandle = {
  getSignatureDataUrl: () => string | undefined;
};

type SignaturePadProps = {
  existingSignatureUrl?: string | null;
  disabled?: boolean;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ existingSignatureUrl, disabled }, ref) {
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
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            {t("clientSignature")}
            <span className="ml-1 text-xs font-normal text-slate-400">
              ({t("optional")})
            </span>
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
        <div className="rounded-lg border border-slate-200 bg-white">
          <SignatureCanvas
            ref={sigRef}
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
