import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Promotion {
  id: number;
  product_name: string;
  price: string;
  image: string;
  link: string;
  coupon: string;
  description: string;
  // Campos de data opcionais que podem vir da API (ISO string ou similar)
  date?: string;
  created_at?: string;
  createdAt?: string;
  published_at?: string;
}

export interface PromotionsResponse {
  data: Promotion[];
  total: number;
  page: number;
  totalPages: number;
}

export function linkify(text: string | undefined | null): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(https?:\/\/[^\s]+|www\.[^\s]+)/g);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (/^(https?:\/\/|www\.)/.test(part)) {
      const href = part.startsWith('http') ? part : `http://${part}`;
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-600 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600 break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function getPromotionDate(promo: Promotion): Date | null {
  const ds = promo.date || promo.created_at || promo.createdAt || promo.published_at;
  if (!ds) return null;
  const d = new Date(ds);
  return isNaN(d.getTime()) ? null : d;
}

// "Hoje", "Ontem", "Há 3 dias" ou dd/mm/aaaa
export function formatPromotionDate(date: Date | null): string | null {
  if (!date) return null;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days > 1 && days < 7) return `Há ${days} dias`;
  return date.toLocaleDateString('pt-BR');
}

// Lista de páginas com reticências: [1, '…', 4, 5, 6, '…', 20]
export function pageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

// Nome da loja a partir do link da oferta
const STORES: [RegExp, string][] = [
  [/aliexpress|s\.click\.ali/i, 'AliExpress'],
  [/amazon|amzn\./i, 'Amazon'],
  [/mercadoli[vb]re|mercadolivre|meli\.la/i, 'Mercado Livre'],
  [/shopee|shp\.ee/i, 'Shopee'],
  [/kabum/i, 'KaBuM!'],
  [/magazineluiza|magalu/i, 'Magalu'],
  [/pichau/i, 'Pichau'],
  [/terabyte/i, 'Terabyte'],
  [/temu/i, 'Temu'],
];

export function getStoreName(link: string | undefined): string | null {
  if (!link) return null;
  for (const [pattern, name] of STORES) {
    if (pattern.test(link)) return name;
  }
  return null;
}

// "R$ 1.299,90" -> { currency: "R$", amount: "1.299,90" }
export function splitPrice(price: string): { currency: string; amount: string } {
  const match = price.trim().match(/^(R\$)\s*(.+)$/i);
  return match ? { currency: 'R$', amount: match[2] } : { currency: '', amount: price.trim() };
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const base =
    'inline-flex items-center justify-center min-w-10 h-10 px-3 rounded-xl text-sm font-semibold transition';
  const ghost = `${base} bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 disabled:opacity-40 disabled:pointer-events-none`;
  return (
    <nav className="flex justify-center items-center gap-1.5 flex-wrap" aria-label="Paginação">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={ghost}
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      {pageNumbers(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={
              p === page
                ? `${base} bg-slate-900 text-white shadow-sm`
                : ghost
            }
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className={ghost}
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </nav>
  );
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores sem Clipboard API (ex.: http ou webviews)
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  }
}
