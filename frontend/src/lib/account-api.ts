import { accountFetch } from "./api-transport";
export async function accountRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
  expectedOwner?: string,
): Promise<T> {
  const response = await accountFetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
      ...(expectedOwner ? { "X-Mindforge-Account": expectedOwner } : {}),
    },
    ...(method !== "GET"
      ? {
          body: JSON.stringify(body ?? {}),
        }
      : {}),
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Please sign in again. Your practice is saved on this device.");
    throw new Error("Account sync is unavailable. Your practice is saved on this device.");
  }
  return response.json() as Promise<T>;
}
