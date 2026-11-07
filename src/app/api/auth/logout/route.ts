import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateUserSessions, verifySessionToken } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("furious_session")?.value;
    if (token) {
      const user = verifySessionToken(token);
      if (user) {
        invalidateUserSessions(user.id);
      }
    }
  } catch {
    // Ignore error
  }

  const response = NextResponse.json({ message: "Logged out" }, { status: 200 });
  response.cookies.set("furious_session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}

