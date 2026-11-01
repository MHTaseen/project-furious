import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  createSessionToken,
  hashPassword,
  PublicUser,
  readUsers,
  UserRecord,
  writeUsers,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!name || !phone || !address || !password || !email) {
      return NextResponse.json(
        { error: "All fields (Name, Phone Number, Address, Password, Email) are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 digits/characters." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const users = readUsers();
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === email || u.phone === phone
    );

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email or phone number already exists." },
        { status: 409 }
      );
    }

    const newUser: UserRecord = {
      id: crypto.randomUUID(),
      name,
      phone,
      address,
      email,
      passwordHash: hashPassword(password),
      passwordPlain: password,
      role: "customer",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    const publicUser: PublicUser = {
      id: newUser.id,
      name: newUser.name,
      phone: newUser.phone,
      address: newUser.address,
      email: newUser.email,
      role: newUser.role,
    };

    const token = createSessionToken(publicUser);
    const response = NextResponse.json(
      { user: publicUser, message: "Account created successfully." },
      { status: 201 }
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
