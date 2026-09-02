import { createAuthClient } from "better-auth/react";

// Same-origin: the client talks to /api/auth on whatever host served the page,
// so there is no baseURL to get wrong between localhost, preview and production.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
