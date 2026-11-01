import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readUsers, verifySessionToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const sessionUser = verifySessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  const users = readUsers();
  const dbUser = users.find((u) => u.id === sessionUser.id);
  if (!dbUser) {
    return NextResponse.json({ user: sessionUser }, { status: 200 });
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
    { status: 200 }
  );
}
