import { createAuthClient } from "better-auth/react";
import { accountFetch } from "./api-transport";
export const authClient = createAuthClient({ fetchOptions: { customFetchImpl: accountFetch } });
