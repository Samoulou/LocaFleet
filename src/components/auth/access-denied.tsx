import { useLocale, useTranslations } from "next-intl";
import { ShieldX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  const t = useTranslations("rbac");
  const locale = useLocale();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <ShieldX className="size-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">{t("accessDenied")}</h1>
      <p className="text-muted-foreground max-w-md">
        {t("accessDeniedDescription")}
      </p>
      <Button asChild variant="outline" className="mt-4">
        <Link href={`/${locale}/vehicles`}>{t("backToHome")}</Link>
      </Button>
    </div>
  );
}
