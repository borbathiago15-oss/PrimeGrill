import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, validarToken } from "@/lib/sessao";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const usuario = await validarToken(req.cookies.get(COOKIE)?.value).catch(() => null);
  if (!usuario) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
