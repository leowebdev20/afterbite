import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/server/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: "Email and a password with at least 6 characters are required." }, { status: 400 });
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash
      }
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }
}
