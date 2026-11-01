import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  hashPassword,
  readUsers,
  verifySessionToken,
  writeUsers,
} from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("furious_session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessionUser = verifySessionToken(token);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = readUsers();
  const customers = users
    .filter((u) => u.role === "customer")
    .map((u) => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      address: u.address,
      email: u.email,
      password: u.passwordPlain || "",
      createdAt: u.createdAt,
    }));

  return NextResponse.json({ customers }, { status: 200 });
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("furious_session")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sessionUser = verifySessionToken(token);
    if (!sessionUser || sessionUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!id || !name || !phone || !address || !email) {
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
    const idx = users.findIndex((u) => u.id === id && u.role === "customer");
    if (idx === -1) {
      return NextResponse.json(
        { error: "Customer account not found." },
        { status: 404 }
      );
    }

    const duplicate = users.find(
      (u) =>
        u.id !== id &&
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

    return NextResponse.json(
      {
        customer: {
          id: users[idx].id,
          name: users[idx].name,
          phone: users[idx].phone,
          address: users[idx].address,
          email: users[idx].email,
          password: users[idx].passwordPlain || "",
          createdAt: users[idx].createdAt,
        },
        message: "Customer details updated successfully.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

