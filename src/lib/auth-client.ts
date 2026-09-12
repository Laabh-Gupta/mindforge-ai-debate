import { createAuthClient } from "better-auth/react";
// Same-origin requests; all credentials and provider configuration stay on the server.
export const authClient = createAuthClient();
