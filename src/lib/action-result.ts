// Server actions and errors across the RSC boundary.
//
// Next.js strips thrown error messages in production (replacing them with a
// generic "An error occurred in the Server Components render…" digest) to avoid
// leaking internals. So a `throw new Error("Patient already booked")` never
// reaches the user in production — they see the scary generic text instead.
//
// The fix: an *expected* error is caught inside the action and RETURNED as data,
// which is not sanitised. It carries an i18n key (not an English sentence) so
// the client renders it localised. Unexpected errors are logged server-side and
// surface as a single generic key.
//
// Usage:
//   export async function book(): Promise<ActionResult<{ id: string }>> {
//     return runAction(async () => {
//       if (past) actionError("appointmentInPast");
//       return { id };
//     });
//   }
// Client:
//   const res = await book();
//   if (!res.ok) return toast.error(tErr(res.error));

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }; // `error` is a key under the "errors" namespace

/** An error whose message is a translation key safe to show the user. */
export class ActionError extends Error {
  constructor(public readonly key: string) {
    super(key);
    this.name = "ActionError";
  }
}

/** Throw a user-facing error identified by its "errors" namespace key. */
export function actionError(key: string): never {
  throw new ActionError(key);
}

/**
 * Run an action body, converting a thrown ActionError into a returned failure
 * so its message survives to the client. Anything else is an unexpected bug:
 * it is logged and reported as the generic "unexpected" key, never leaked.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ActionError) {
      return { ok: false, error: error.key };
    }
    console.error("[action] unexpected error:", error);
    return { ok: false, error: "unexpected" };
  }
}
