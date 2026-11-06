import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { appRoutes } from "@/lib/app-routes";

function normalizeNextPath(input?: string | null) {
  if (!input || !input.startsWith("/")) {
    return appRoutes.workspace;
  }

  return input;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(
          ({ name, value }: { name: string; value: string; options: CookieOptions }) => {
            request.cookies.set(name, value);
          },
        );

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(
          ({ name, value, options }: { name: string; value: string; options: CookieOptions }) => {
            response.cookies.set(name, value, options);
          },
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isWorkspaceRoute =
    pathname === appRoutes.workspace ||
    pathname.startsWith(`${appRoutes.workspace}/`);
  const isLoginRoute = pathname === appRoutes.login;

  if (isWorkspaceRoute && !user) {
    const url = request.nextUrl.clone();
    const next = normalizeNextPath(
      `${pathname}${request.nextUrl.search ? request.nextUrl.search : ""}`,
    );
    url.pathname = appRoutes.login;
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = appRoutes.workspace;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
