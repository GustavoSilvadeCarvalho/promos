import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Server-side admin client (use Service Role Key if provided). This key must NEVER be exposed to the client.
const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey,
);
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log("Using SUPABASE_SERVICE_ROLE_KEY for server-side writes");
} else {
  console.warn(
    "No SUPABASE_SERVICE_ROLE_KEY found — server will use anon key for writes (may be blocked by RLS)",
  );
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    const limitParam = parseInt(url.searchParams.get("limit") || "10", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 10;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const q = (url.searchParams.get("q") || "").trim();

    let query: any = supabase
      .from("promotions")
      .select("*", { count: "exact" });
    if (q) {
      // case-insensitive partial match on product_name
      query = query.ilike("product_name", `%${q}%`);
    }

    const { data, count, error } = await query
      .order("id", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({ data: data || [], total, page, totalPages });
  } catch (error) {
    console.error("Erro ao buscar promoções:", error);
    return NextResponse.json(
      { data: [], total: 0, page: 1, totalPages: 1 },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { password, action, promotion } = await request.json();

    // Leia a senha admin das variáveis de ambiente no servidor
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

    // Checa cookie de sessão `admin_auth` (setado pela rota /api/auth)
    const cookie = request.cookies.get("admin_auth")?.value;
    const authorized =
      cookie === "1" || (password && password === ADMIN_PASSWORD);

    if (!authorized) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
    }

    if (action === "add") {
      // Ensure we don't send an `id` when inserting (DB generates it)
      const { id: _maybeId, ...toInsert } = promotion || {};
      // Use admin client for writes to avoid RLS/permission issues with anon key
      const { data, error } = await supabaseAdmin
        .from("promotions")
        .insert([toInsert])
        .select();
      console.log("promotions:add -> toInsert=", toInsert, "result=", {
        data,
        error,
      });
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return NextResponse.json(
          {
            success: false,
            error: "No rows inserted (possible RLS or permission issue)",
          },
          { status: 403 },
        );
      }
      return NextResponse.json(
        { success: true, data: data?.[0] || toInsert },
        { status: 201 },
      );
    }

    if (action === "update") {
      // Don't attempt to update the identity `id` column
      const { id, ...toUpdate } = promotion || {};
      const { data, error } = await supabaseAdmin
        .from("promotions")
        .update(toUpdate)
        .eq("id", id)
        .select();
      console.log(
        "promotions:update -> id=",
        id,
        "toUpdate=",
        toUpdate,
        "result=",
        { data, error },
      );
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No rows updated (possible RLS, wrong id, or permission issue)",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ success: true, data: data?.[0] || toUpdate });
    }

    if (action === "delete") {
      const { data, error } = await supabaseAdmin
        .from("promotions")
        .delete()
        .eq("id", promotion.id)
        .select();
      console.log("promotions:delete -> id=", promotion.id, "result=", {
        data,
        error,
      });
      if (error) throw error;
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No rows deleted (possible RLS, wrong id, or permission issue)",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro:", error);
    return NextResponse.json(
      { error: "Erro ao processar requisição" },
      { status: 500 },
    );
  }
}
