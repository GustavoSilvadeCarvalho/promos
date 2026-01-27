import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get("admin_auth")?.value;
  const authenticated = cookie === "1";
  return NextResponse.json({ authenticated });
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    const res = NextResponse.json({ authenticated: true });
    // Set cookie httpOnly for session (1 hour)
    // Don't set `Secure` in development to allow localhost testing
    const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.set(
      "Set-Cookie",
      `admin_auth=1; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax${secureFlag}`,
    );
    return res;
  } catch (error) {
    console.error("Erro na autenticação:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ authenticated: false });
  // Expire cookie
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.set(
    "Set-Cookie",
    `admin_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`,
  );
  return res;
}
