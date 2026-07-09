"use client";

import { Direction } from "radix-ui";

/**
 * Radix primitives read text direction from their own context, not from the
 * `dir` attribute on <html>. Without this provider they assume LTR, which
 * mis-positions dropdown submenus and reverses arrow-key navigation in Arabic.
 */
export function DirectionProvider({
  dir,
  children,
}: {
  dir: "ltr" | "rtl";
  children: React.ReactNode;
}) {
  return <Direction.Provider dir={dir}>{children}</Direction.Provider>;
}
