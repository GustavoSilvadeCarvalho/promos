import { NextRequest, NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { checkPassword, isAuthenticated } from "@/lib/auth";

const MAX_LIMIT = 50;

// Apenas estes campos podem ser gravados pelo admin
const EDITABLE_FIELDS = [
  "product_name",
  "price",
  "image",
  "link",
  "coupon",
  "description",
] as const;

function pickEditable(input: unknown): Record<string, string> {
  const source = (input ?? {}) as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    const value = source[field];
    if (typeof value === "string") result[field] = value.trim();
  }
  return result;
}

function parseId(input: unknown): number | null {
  const id = Number((input as { id?: unknown } | undefined)?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const pageParam = parseInt(url.searchParams.get("page") || "1", 10);
    const limitParam = parseInt(url.searchParams.get("limit") || "10", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, MAX_LIMIT)
        : 10;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Escapa curingas do ILIKE para que "%" e "_" sejam buscados literalmente
    const q = (url.searchParams.get("q") || "")
      .trim()
      .slice(0, 100)
      .replace(/[\\%_]/g, (c) => `\\${c}`);

    let query = supabase.from("promotions").select("*", { count: "exact" });
    if (q) {
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

    // Sessão assinada (cookie setado por /api/auth) ou senha enviada no corpo
    if (!isAuthenticated(request) && !checkPassword(password)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    if (action === "add") {
      const toInsert = pickEditable(promotion);
      if (!toInsert.product_name || !toInsert.link) {
        return NextResponse.json(
          { error: "Nome do produto e link são obrigatórios" },
          { status: 400 },
        );
      }
      const { data, error } = await supabaseAdmin
        .from("promotions")
        .insert([{ ...toInsert, created_at: new Date().toISOString() }])
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "No rows inserted (possible RLS or permission issue)",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ success: true, data: data[0] }, { status: 201 });
    }

    if (action === "update") {
      const id = parseId(promotion);
      if (!id) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from("promotions")
        .update(pickEditable(promotion))
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No rows updated (possible RLS, wrong id, or permission issue)",
          },
          { status: 403 },
        );
      }
      return NextResponse.json({ success: true, data: data[0] });
    }

    if (action === "delete") {
      const id = parseId(promotion);
      if (!id) {
        return NextResponse.json({ error: "ID inválido" }, { status: 400 });
      }
      const { data, error } = await supabaseAdmin
        .from("promotions")
        .delete()
        .eq("id", id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
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
