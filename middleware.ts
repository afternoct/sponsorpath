import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Touch auth so session refresh happens when needed
  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    /*
      Add the routes you actually want middleware on.
      Example:
      "/dashboard/:path*",
      "/signin",
      "/get-started/:path*",
    */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
