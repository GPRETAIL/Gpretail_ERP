import { requestCacheScope } from "./requestCacheScope";

// Profile/counter/theme edits are not a new authenticated request scope.
export function backgroundRequestIdentity(user, token) {
  if (!user?.id) return null;
  return JSON.stringify([requestCacheScope(), user?.id, token, user?.company_id, user?.role, user?.platform_company_code]);
}
