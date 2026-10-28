'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowUpRight,
  Check,
  Clock,
  CloudOff,
  Copy,
  ImageOff,
  MousePointerClick,
  PackageOpen,
  Search,
  SearchX,
  Sparkles,
  Store,
  Tag,
  TicketPercent,
  X,
} from 'lucide-react';
import {
  copyToClipboard,
  formatPromotionDate,
  getPromotionDate,
  getStoreName,
  linkify,
  Pagination,
  splitPrice,
  type Promotion,
  type PromotionsResponse,
} from '@/lib/promotions';
import { useToast } from '@/components/Toast';
import { Logo } from '@/components/Logo';

const LIMIT = 12;

// Lê ?q= e ?page= da URL para permitir compartilhar buscas
function readUrlState() {
  if (typeof window === 'undefined') return { q: '', page: 1 };
  const params = new URLSearchParams(window.location.search);
  const page = parseInt(params.get('page') || '1', 10);
  return { q: params.get('q') || '', page: page > 0 ? page : 1 };
}

function writeUrlState(q: string, page: number) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

function PromoImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="absolute inset-0 grid place-items-center text-slate-300">
        <ImageOff className="size-10" strokeWidth={1.5} aria-hidden />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className="object-contain p-6 mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
      onError={() => setFailed(true)}
    />
  );
}

function CouponButton({ coupon, onCopy }: { coupon: string; onCopy: (coupon: string) => Promise<boolean> }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    if (await onCopy(coupon)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="group/coupon flex w-full items-center gap-3 rounded-xl border border-dashed border-deal-500/50 bg-deal-50 py-2 pl-3 pr-2 text-left transition hover:border-deal-500 hover:bg-deal-100"
      title="Clique para copiar o cupom"
    >
      <TicketPercent className="size-5 shrink-0 text-deal-600" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-deal-700/70">Cupom</span>
        <span className="block truncate font-mono text-sm font-bold tracking-wide text-deal-700">{coupon}</span>
      </span>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
          copied ? 'bg-deal-600 text-white' : 'bg-white text-deal-700 ring-1 ring-deal-500/30 group-hover/coupon:ring-deal-500/60'
        }`}
      >
        {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
        {copied ? 'Copiado' : 'Copiar'}
      </span>
    </button>
  );
}

function PromoCard({ promo, onCopy }: { promo: Promotion; onCopy: (coupon: string) => Promise<boolean> }) {
  const dateLabel = formatPromotionDate(getPromotionDate(promo));
  const isNew = dateLabel === 'Hoje';
  const store = getStoreName(promo.link);
  const price = promo.price ? splitPrice(promo.price) : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.07] hover:ring-slate-300">
      <a
        href={promo.link}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-5/4 bg-linear-to-b from-slate-50 to-slate-100/70"
        aria-label={`Ver oferta: ${promo.product_name}`}
      >
        <PromoImage src={promo.image} alt={promo.product_name} />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {dateLabel ? (
            isNew ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-deal-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                <Sparkles className="size-3.5" aria-hidden />
                Nova
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur">
                <Clock className="size-3.5" aria-hidden />
                {dateLabel}
              </span>
            )
          ) : (
            <span />
          )}
          {store && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-900/5 backdrop-blur">
              <Store className="size-3.5" aria-hidden />
              {store}
            </span>
          )}
        </div>
      </a>

      <div className="flex flex-1 flex-col p-5">
        <h2
          className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900"
          title={promo.product_name}
        >
          {promo.product_name}
        </h2>

        {promo.description && (
          <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-slate-500">
            {linkify(promo.description)}
          </p>
        )}

        <div className="mt-auto space-y-3 pt-5">
          {price && (
            <p className="flex items-baseline gap-1 text-slate-900">
              {price.currency && <span className="text-sm font-semibold text-slate-500">{price.currency}</span>}
              <span className="text-3xl font-bold tracking-tight">{price.amount}</span>
            </p>
          )}

          {promo.coupon && <CouponButton coupon={promo.coupon} onCopy={onCopy} />}

          <a
            href={promo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200"
          >
            Ver oferta
            <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
      <div className="aspect-5/4 animate-pulse bg-slate-100" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-8 w-1/3 animate-pulse rounded-lg bg-slate-200 !mt-6" />
        <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

function StateMessage({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon className="size-7" strokeWidth={1.75} />
      </span>
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

const highlights = [
  { icon: Tag, text: 'Ofertas selecionadas' },
  { icon: TicketPercent, text: 'Cupons com um clique' },
  { icon: MousePointerClick, text: 'Link direto para a loja' },
];

export default function Home() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [ready, setReady] = useState(false);
  const listTop = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Restaura busca/página da URL ao abrir
  useEffect(() => {
    const { q, page } = readUrlState();
    setSearchTerm(q);
    setSearch(q);
    setPage(page);
    setReady(true);
  }, []);

  // Busca automática enquanto digita (com atraso)
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const term = searchTerm.trim();
      if (term !== search) {
        setSearch(term);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm, search, ready]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    writeUrlState(search, page);

    (async () => {
      setLoading(true);
      setError(false);
      try {
        const q = search ? `&q=${encodeURIComponent(search)}` : '';
        const response = await fetch(`/api/promotions?page=${page}&limit=${LIMIT}${q}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const res: PromotionsResponse = await response.json();
        setPromotions(res.data || []);
        setTotalPages(res.totalPages || 1);
        setTotal(res.total || 0);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Erro ao carregar promoções:', err);
        setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [page, search, ready, reloadKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchTerm.trim());
    setPage(1);
    searchInput.current?.blur();
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearch('');
    setPage(1);
  };

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCopy = async (coupon: string) => {
    const ok = await copyToClipboard(coupon);
    toast.show(ok ? `Cupom ${coupon} copiado` : 'Não foi possível copiar o cupom', ok ? 'success' : 'error');
    return ok;
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" onClick={clearSearch} aria-label="Setup no Precinho — início">
            <Logo />
          </Link>
        </div>
      </nav>

      {/* Hero + busca */}
      <header className="relative isolate overflow-hidden bg-slate-950 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <div className="bg-grid absolute inset-0 -z-10 mask-[radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        <div className="absolute -top-40 left-1/2 -z-10 h-112 w-224 -translate-x-1/2 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-32 right-0 -z-10 h-72 w-72 rounded-full bg-deal-500/10 blur-3xl" />

        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-brand-200 ring-1 ring-inset ring-white/10">
            <Sparkles className="size-3.5" aria-hidden />
            Hardware, periféricos e tudo para o seu setup
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Monte seu setup{' '}
            <span className="bg-linear-to-r from-brand-300 via-brand-400 to-deal-500 bg-clip-text text-transparent">
              gastando pouco
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-400 sm:text-lg">
            As melhores promoções e cupons de desconto, reunidos em um só lugar.
          </p>

          <form onSubmit={handleSearchSubmit} role="search" className="mx-auto mt-8 max-w-xl">
            <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl shadow-brand-950/50 ring-1 ring-white/10 focus-within:ring-4 focus-within:ring-brand-400/40">
              <Search className="ml-2 size-5 shrink-0 text-slate-400" aria-hidden />
              <input
                ref={searchInput}
                type="text"
                inputMode="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto, ex: mouse, monitor..."
                aria-label="Buscar produto"
                className="h-10 min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Limpar busca"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
              <button
                type="submit"
                className="h-10 shrink-0 rounded-xl bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-500"
              >
                Buscar
              </button>
            </div>
          </form>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="inline-flex items-center gap-1.5">
                <Icon className="size-4 text-brand-300" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {/* Lista */}
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div ref={listTop} className="mx-auto max-w-6xl scroll-mt-24">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {search ? 'Resultados da busca' : 'Últimas ofertas'}
              </h2>
              <p className="mt-1 h-5 text-sm text-slate-500">
                {!loading && !error && (
                  search ? (
                    <>
                      {total} {total === 1 ? 'resultado' : 'resultados'} para{' '}
                      <span className="font-semibold text-slate-700">&ldquo;{search}&rdquo;</span>
                    </>
                  ) : (
                    <>
                      {total} {total === 1 ? 'oferta disponível' : 'ofertas disponíveis'}
                    </>
                  )
                )}
              </p>
            </div>
            {search && (
              <button
                onClick={clearSearch}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                <X className="size-3.5" aria-hidden />
                Limpar busca
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <StateMessage
              icon={CloudOff}
              title="Não foi possível carregar as ofertas"
              text="Verifique sua conexão e tente de novo em instantes."
              action={
                <button
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                >
                  Tentar novamente
                </button>
              }
            />
          ) : promotions.length === 0 ? (
            search ? (
              <StateMessage
                icon={SearchX}
                title={`Nada encontrado para "${search}"`}
                text="Tente outro termo ou veja todas as ofertas disponíveis."
                action={
                  <button
                    onClick={clearSearch}
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Ver todas as ofertas
                  </button>
                }
              />
            ) : (
              <StateMessage
                icon={PackageOpen}
                title="Nenhuma oferta no momento"
                text="Novas promoções aparecem aqui assim que forem publicadas."
              />
            )
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {promotions.map((promo) => (
                <PromoCard key={promo.id} promo={promo} onCopy={handleCopy} />
              ))}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-12">
              <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo dark />
            <p className="mt-3 max-w-sm text-sm text-slate-400">
              Promoções e cupons para montar o seu setup gastando pouco.
            </p>
          </div>
          <div className="text-sm text-slate-500 sm:text-right">
            <p>Preços e cupons podem mudar sem aviso. Confira na loja antes de comprar.</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} Setup no Precinho. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {toast.element}
    </div>
  );
}
