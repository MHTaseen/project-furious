import { NextResponse } from "next/server";
import {
  createSessionToken,
  PublicUser,
  readUsers,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const phoneInput =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!phoneInput || !password) {
      return NextResponse.json(
        { error: "Phone Number and Password are required." },
        { status: 400 }
      );
    }

    const users = readUsers();
    const normalized = phoneInput.toLowerCase();
    const user = users.find(
      (u) =>
        (u.phone && u.phone === phoneInput) ||
        u.email.toLowerCase() === normalized ||
        u.name.toLowerCase() === normalized
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { error: "Invalid phone number or password." },
        { status: 401 }
      );
    }

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      address: user.address,
      email: user.email,
      role: user.role,
    };

    const token = createSessionToken(publicUser);
    const response = NextResponse.json(
      { user: publicUser, message: "Signed in successfully." },
      { status: 200 }
    );

    response.cookies.set("furious_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}
