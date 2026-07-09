"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { setUserLocale } from "@/i18n/locale";
import { locales, localeNames, type Locale } from "@/i18n/config";

// A physical two-position switch rather than the app's dropdown: it needs no
// portal, so it can't leak the light-theme popover onto the dark splash.
const SHORT: Record<Locale, string> = { en: "EN", ar: "ع" };

export function LocaleToggle() {
  const t = useTranslations("language");
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const select = (locale: Locale) => {
    if (locale === active) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  };

  return (
    <div className="sp-locale" role="group" aria-label={t("switchLabel")}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          onClick={() => select(locale)}
          disabled={isPending}
          aria-current={locale === active}
          className="sp-locale__btn"
        >
          <span aria-hidden="true">{SHORT[locale]}</span>
          <span className="sp-sr-only">{localeNames[locale]}</span>
        </button>
      ))}
    </div>
  );
}
