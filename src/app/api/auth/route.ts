import { NextRequest, NextResponse } from "next/server";
import {
  checkPassword,
  createSessionToken,
  isAuthenticated,
  sessionCookie,
  SESSION_MAX_AGE,
} from "@/lib/auth";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAuthenticated(request) });
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!checkPassword(password)) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const res = NextResponse.json({ authenticated: true });
    // Cookie httpOnly assinado (HMAC) — não pode ser forjado no navegador
    res.headers.set("Set-Cookie", sessionCookie(createSessionToken(), SESSION_MAX_AGE));
    return res;
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  res.headers.set("Set-Cookie", sessionCookie("", 0));
  return res;
}
