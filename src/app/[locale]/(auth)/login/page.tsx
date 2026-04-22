import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/auth/language-switcher";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">LocaFleet</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("tagline")}</p>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h2 className="mb-6 text-center text-xl font-semibold text-card-foreground">
          {t("login")}
        </h2>
        <LoginForm />
      </div>

      <div className="mt-6">
        <LanguageSwitcher />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {t("copyright", { year: new Date().getFullYear() })}
      </p>
    </div>
  );
}
