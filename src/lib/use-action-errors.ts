import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ActionResult } from "./action-result";

/**
 * Client-side companion to `ActionResult`. Toasts localized error messages from
 * the "errors" namespace, so call sites don't hand-roll the translation.
 *
 *   const { failed, showError } = useActionErrors();
 *   try {
 *     const res = await someAction();
 *     if (failed(res)) return;         // toasts the localized error, stops here
 *     toast.success(...);
 *   } catch {
 *     showError();                     // unexpected (e.g. network) → generic
 *   }
 */
export function useActionErrors() {
  const t = useTranslations("errors");

  /** Toast a failed result's localized error. Returns true when it failed. */
  const failed = (res: ActionResult<unknown>): boolean => {
    if (!res.ok) {
      toast.error(t(res.error));
      return true;
    }
    return false;
  };

  /** Toast a specific error key (defaults to the generic "unexpected"). */
  const showError = (key: string = "unexpected") => toast.error(t(key));

  return { t, failed, showError };
}
