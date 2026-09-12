import { authClient } from "@/lib/auth-client";
import { toAuthUser } from "@/services/auth";
export function useAuthUser() {
  const { data, isPending } = authClient.useSession();
  return { user: data?.user ? toAuthUser(data.user) : null, loading: isPending };
}
