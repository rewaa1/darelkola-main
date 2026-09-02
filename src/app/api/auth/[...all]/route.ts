import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Every Better Auth endpoint (sign-in, sign-out, get-session) lives under this
// one catch-all. proxy.ts must keep excluding /api from its matcher, or the
// redirect for unauthenticated requests would swallow the sign-in POST itself.
export const { GET, POST } = toNextJsHandler(auth);
