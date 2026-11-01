import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionToken,
  hashPassword,
  PublicUser,
  readUsers,
  verifySessionToken,
  writeUsers,
} from "@/lib/auth";

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("furious_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessionUser = verifySessionToken(token);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !phone || !address || !email) {
      return NextResponse.json(
        { error: "Name, Phone Number, Address, and Email are required." },
        { status: 400 }
      );
    }

    if (password && password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 digits/characters." },
        { status: 400 }
      );
    }

    const users = readUsers();
    const idx = users.findIndex((u) => u.id === sessionUser.id);
    if (idx === -1) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const duplicate = users.find(
      (u) =>
        u.id !== sessionUser.id &&
        (u.email.toLowerCase() === email || u.phone === phone)
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Another account already uses this email or phone number." },
        { status: 409 }
      );
    }

    users[idx].name = name;
    users[idx].phone = phone;
    users[idx].address = address;
    users[idx].email = email;
    if (password) {
      users[idx].passwordHash = hashPassword(password);
      users[idx].passwordPlain = password;
    }

    writeUsers(users);

    const updatedPublicUser: PublicUser = {
      id: users[idx].id,
      name: users[idx].name,
      phone: users[idx].phone,
      address: users[idx].address,
      email: users[idx].email,
      role: users[idx].role,
    };

    const newToken = createSessionToken(updatedPublicUser);
    const response = NextResponse.json(
      {
        user: {
          ...updatedPublicUser,
          password: users[idx].passwordPlain || "",
        },
        message: "Profile updated successfully.",
      },
      { status: 200 }
    );

    response.cookies.set("furious_session", newToken, {
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

