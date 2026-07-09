/**
 * Failures that provably happened *before* the request left this machine.
 * Only these are safe to retry, because a non-idempotent call (creating a
 * user) can never have reached Supabase. Anything after the bytes are on the
 * wire — ECONNRESET, a socket hang-up mid-response — is left to fail loudly
 * rather than risk creating the account twice.
 */
const RETRIABLE_PRE_SEND = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

const MAX_ATTEMPTS = 3;

function causeCode(err: unknown): string {
  return (err as { cause?: { code?: string } })?.cause?.code ?? "";
}

/**
 * Call the Supabase Auth admin API with the service-role key.
 *
 * Supabase sits behind Cloudflare, and outbound connects to it stall often
 * enough that a single dropped TCP handshake would otherwise surface to the
 * doctor as a bare `TypeError: fetch failed`. Retries the connect phase, then
 * reports something a human can act on.
 */
export async function supabaseAdminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "User management is not configured on the server (missing service role key)",
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error(
      "User management is not configured on the server (missing Supabase URL)",
    );
  }

  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          ...init.headers,
        },
      });
    } catch (err) {
      const code = causeCode(err);
      if (attempt >= MAX_ATTEMPTS || !RETRIABLE_PRE_SEND.has(code)) {
        throw new Error(
          `Could not reach Supabase (${code || "network error"}). Check the connection and try again.`,
        );
      }
      // 300ms, then 600ms
      await new Promise((r) => setTimeout(r, 300 * 2 ** (attempt - 1)));
    }
  }
}
