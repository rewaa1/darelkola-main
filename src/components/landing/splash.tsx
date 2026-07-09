"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, Stethoscope } from "lucide-react";

import { getDirection, type Locale } from "@/i18n/config";
import { LocaleToggle } from "./locale-toggle";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const INSTANT = { duration: 0 } as const;

/*
 * Year of first publication, not the current year. Copyright in this system is
 * retained by Orbix, who built it; Dar El Kola Clinic is licensed to use it.
 * Deliberately fixed — do not replace with `new Date().getFullYear()`, which
 * would silently overwrite the date protection actually began.
 *
 * Passed to ICU as a string so it renders "2026" rather than the grouped
 * "2,026" a number argument would produce.
 */
const COPYRIGHT_YEAR = "2026";

/** What waits on the other side of the door. */
const SYSTEMS = [
  "patients",
  "queue",
  "appointments",
  "medications",
  "records",
] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0.09 } },
};

// The rail settles last, once the door itself is already there to walk through.
const railContainer: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.6, staggerChildren: 0.06 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

export function Splash({ fontClassName }: { fontClassName: string }) {
  const t = useTranslations("landing");
  const locale = useLocale() as Locale;
  const dir = getDirection(locale);
  const reduced = usePrefersReducedMotion();

  const transition = reduced
    ? { duration: 0.25 }
    : { duration: 0.75, ease: EASE_OUT_EXPO };

  const Arrow = dir === "rtl" ? ArrowLeft : ArrowRight;
  const isArabic = dir === "rtl";

  return (
    <main className={`splash ${fontClassName}`}>
      <div className="splash__field" aria-hidden="true" />

      <header className="splash__rail">
        <div className="flex items-center gap-3">
          <span className="sp-label">{t("unit")}</span>
          <span className="sp-rule" aria-hidden="true" />
          <span className="sp-label">{t("branches")}</span>
        </div>
        <LocaleToggle />
      </header>

      <motion.div
        className="splash__core"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <div className="splash__copy">
          <motion.div
            data-reveal
            variants={item}
            transition={transition}
            className="sp-mark"
          >
            {/* The ring draws itself once, then holds. */}
            <svg className="sp-mark__ring" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="var(--sp-line)"
                strokeWidth="1"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="var(--sp-ink)"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{
                  rotate: -90,
                  transformBox: "view-box",
                  transformOrigin: "50px 50px",
                }}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={
                  reduced ? INSTANT : { duration: 1.5, delay: 0.35, ease: EASE_OUT_EXPO }
                }
              />
            </svg>
            <Stethoscope className="sp-mark__icon" aria-hidden="true" />
          </motion.div>

          <motion.h1
            data-reveal
            variants={item}
            transition={transition}
            className="splash__wordmark"
          >
            {isArabic ? t("wordmarkArabic") : t("wordmark")}
          </motion.h1>

          <motion.p
            data-reveal
            variants={item}
            transition={transition}
            className="splash__wordmark-alt"
            lang={isArabic ? "en" : "ar"}
            dir={isArabic ? "ltr" : "rtl"}
          >
            {isArabic ? t("wordmark") : t("wordmarkArabic")}
          </motion.p>

          <motion.p
            data-reveal
            variants={item}
            transition={transition}
            className="splash__tagline"
          >
            {t("tagline")}
          </motion.p>

          <motion.div
            data-reveal
            variants={item}
            transition={transition}
            className="splash__actions"
          >
            <Link
              href="/login"
              className="sp-cta"
              style={
                { "--sp-arrow-shift": isArabic ? "-3px" : "3px" } as React.CSSProperties
              }
            >
              {t("signIn")}
              <Arrow className="sp-cta__arrow size-4" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </motion.div>

      <motion.footer
        className="splash__systems"
        variants={railContainer}
        initial="hidden"
        animate="show"
      >
        <ul className="sp-systems-list">
          {SYSTEMS.map((key) => (
            <motion.li
              key={key}
              data-reveal
              variants={item}
              transition={transition}
              className="sp-label"
            >
              {t(`systems.${key}`)}
            </motion.li>
          ))}
        </ul>

        <motion.p
          data-reveal
          variants={item}
          transition={transition}
          className="sp-copyright"
        >
          {t("copyright", { year: COPYRIGHT_YEAR })}
        </motion.p>
      </motion.footer>
    </main>
  );
}
