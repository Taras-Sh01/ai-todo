import { cookies } from "next/headers";

export const VISITOR_COOKIE = "visitor_id";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

// Read-only — safe from Server Components (which cannot set cookies).
// proxy.ts guarantees this cookie exists on any request after the first;
// a visitor with none yet simply has no tasks, so null is a valid result.
export async function getVisitorId(): Promise<string | null> {
  const store = await cookies();
  return store.get(VISITOR_COOKIE)?.value ?? null;
}

// Read+create — only safe from Server Actions/Route Handlers. Defense in
// depth alongside proxy.ts (Next.js explicitly warns not to rely on proxy
// alone for identity, since a matcher change could silently skip it).
export async function getOrCreateVisitorId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VISITOR_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  store.set(VISITOR_COOKIE, id, COOKIE_OPTIONS);
  return id;
}
