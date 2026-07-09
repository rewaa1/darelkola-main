import type { Metadata } from "next";
import { Archivo } from "next/font/google";

import { Splash } from "@/components/landing/splash";
import "@/components/landing/splash.css";

// A grotesque with a width axis — instrument silkscreen rather than another UI
// sans. Loaded only by this route, so it never reaches the dashboard.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Darelkola — Renal Unit",
  description: "Clinic management for Darelkola, a nephrology clinic in Cairo.",
};

// The threshold, shown before sign-in. It knows nothing about who is looking at
// it: staff who already have a session are sent on to the dashboard by the
// proxy and never reach this page.
export default function SplashPage() {
  return <Splash fontClassName={archivo.variable} />;
}
