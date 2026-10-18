import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_ORG } from "./config";
import { ORG_COOKIE } from "./session";

/** The signed-in organization's slug (request data: call inside Suspense). */
export async function currentOrgSlug(): Promise<string> {
  return (await cookies()).get(ORG_COOKIE)?.value ?? DEFAULT_ORG;
}
