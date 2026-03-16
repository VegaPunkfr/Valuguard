import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/command")) {
    const secret = process.env.COMMAND_SECRET;
    const urlKey = request.nextUrl.searchParams.get("key");
    const cookieKey = request.cookies.get("gt-command-key")?.value;

    if (secret && (urlKey === secret || cookieKey === secret)) {
      const response = NextResponse.next();
      if (urlKey === secret && cookieKey !== secret) {
        response.cookies.set("gt-command-key", secret, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          maxAge: 2592000,
          path: "/command",
        });
      }
      return response;
    }
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/command/:path*"],
};
