import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erro ao buscar promoções:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { password, action, promotion } = await request.json();

    // Proteção por senha simples (MUDE ISSO PARA SUA SENHA)
    const ADMIN_PASSWORD = 'senha123';
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
    }

    if (action === 'add') {
      const { data, error } = await supabase
        .from('promotions')
        .insert([promotion])
        .select();

      if (error) throw error;
      return NextResponse.json(data?.[0] || promotion, { status: 201 });
    }

    if (action === 'update') {
      const { data, error } = await supabase
        .from('promotions')
        .update(promotion)
        .eq('id', promotion.id)
        .select();

      if (error) throw error;
      return NextResponse.json(data?.[0] || promotion);
    }

    if (action === 'delete') {
      const { error } = await supabase
        .from('promotions')
        .delete()
        .eq('id', promotion.id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    );
  }
}
