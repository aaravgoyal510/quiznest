import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  const secureCookie = process.env.NODE_ENV === "production" || req.url.startsWith("https://");
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName,
    salt: cookieName,
  });
  const { pathname } = req.nextUrl;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (!token && !isAuthPage && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isAuthPage) {
    const role = (token.role as string) || "STUDENT";
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    if (role === "TEACHER") return NextResponse.redirect(new URL("/teacher/dashboard", req.url));
    return NextResponse.redirect(new URL("/student/dashboard", req.url));
  }

  if (token) {
    const role = token.role as string;
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL(role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard", req.url));
    }
    if (pathname.startsWith("/teacher") && !["ADMIN", "TEACHER"].includes(role)) {
      return NextResponse.redirect(new URL("/student/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/login", "/register"],
};
