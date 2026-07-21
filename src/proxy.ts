import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { VISITOR_COOKIE } from "@/lib/visitor";

// Bootstraps an anonymous per-visitor id (cookie, no login) as early as
// possible so different people never share the same task list. This is a
// best-effort head start — every Server Action re-checks/creates its own
// (see src/lib/visitor.ts), since a matcher change here could otherwise
// silently drop coverage.
export function proxy(request: NextRequest) {
  if (request.cookies.get(VISITOR_COOKIE)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
