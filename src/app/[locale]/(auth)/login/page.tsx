import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitcher } from "@/components/auth/language-switcher";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">LocaFleet</h1>
        <p className="mt-1 text-sm text-slate-500">{t("tagline")}</p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-center text-xl font-semibold text-slate-900">
          {t("login")}
        </h2>
        <LoginForm />
      </div>

      <div className="mt-6">
        <LanguageSwitcher />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        {t("copyright", { year: new Date().getFullYear() })}
      </p>
    </div>
  );
}
