import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readUsers, verifySessionToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;

  const noCacheHeaders = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };

  const clearStaleCookie = (res: NextResponse) => {
    res.cookies.set("furious_session", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
    return res;
  };

  if (!token) {
    return NextResponse.json({ user: null }, { status: 200, headers: noCacheHeaders });
  }
  const sessionUser = verifySessionToken(token);
  if (!sessionUser) {
    const res = NextResponse.json({ user: null }, { status: 200, headers: noCacheHeaders });
    return clearStaleCookie(res);
  }

  const users = readUsers();
  const dbUser = users.find((u) => u.id === sessionUser.id);
  if (!dbUser) {
    const res = NextResponse.json({ user: null }, { status: 200, headers: noCacheHeaders });
    return clearStaleCookie(res);
  }

  return NextResponse.json(
    {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        phone: dbUser.phone,
        address: dbUser.address,
        email: dbUser.email,
        role: dbUser.role,
        password: dbUser.passwordPlain || "",
      },
    },
    { status: 200, headers: noCacheHeaders }
  );
}
