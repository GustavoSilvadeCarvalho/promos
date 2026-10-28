'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Image as ImageIcon,
  LoaderCircle,
  Lock,
  LogOut,
  PackageOpen,
  Pencil,
  Plus,
  Search,
  TicketPercent,
  Trash,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  formatPromotionDate,
  getPromotionDate,
  Pagination,
  type Promotion,
  type PromotionsResponse,
} from '@/lib/promotions';
import { useToast } from '@/components/Toast';
import { Logo } from '@/components/Logo';

const LIMIT = 10;

const EMPTY_FORM = {
  product_name: '',
  price: '',
  image: '',
  link: '',
  coupon: '',
  description: '',
};

const inputClass =
  'w-full rounded-lg bg-white px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-400 transition focus:outline-none focus:ring-2 focus:ring-brand-500';
const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';
const panelClass = 'rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 sm:p-8';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none';
const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50';

function parsePostText(raw: string) {
  // 1. Quebra em linhas e remove linhas vazias
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let product_name = '';
  let price = '';
  let link = '';
  let coupon = '';
  const descriptionLines: string[] = [];

  // Regex auxiliares
  const linkRegex = /(https?:\/\/\S+)/i;
  // Detecta linha de preço mesmo com emoji antes
  const priceLineRegex = /(?:PRE\s?ÇO|R\$)\s*[:\s]\s*(?:R\$\s*)?([\d.,]+)/i;
  // Detecta linha de cupom
  const couponLineRegex = /(?:CUPOM|CÓDIGO)\s*[:\s]\s*(.*)/i;
  // Palavras que indicam que a linha NÃO é um nome de produto
  const ignoreNameRegex = /(?:PRE\s?ÇO|R\$|CUPOM|ENVIO|NO APP|MOEDAS|LINK|HTTP|⚠️|🇧🇷|💵|🎟|🔥)/i;

  lines.forEach((line) => {
    // A. LINK (prioridade máxima)
    const linkMatch = line.match(linkRegex);
    if (linkMatch) {
      link = linkMatch[1];
      return;
    }

    // B. PREÇO
    const priceMatch = line.match(priceLineRegex);
    if (priceMatch) {
      const rawNumber = priceMatch[1] || line.replace(/[^0-9,.]/g, '');
      price = `R$ ${rawNumber.trim()}`;
      return;
    }

    // C. CUPOM (tudo depois de "Cupom:", incluindo as moedas)
    const couponMatch = line.match(couponLineRegex);
    if (couponMatch) {
      coupon = couponMatch[1].trim();
      return;
    }

    // D. NOME DO PRODUTO: primeira linha que não parece metadado
    if (!product_name && !line.match(ignoreNameRegex) && line.length > 3) {
      // Remove emojis do início (ex: "🔥Microfone" vira "Microfone")
      product_name = line.replace(/^[\p{Emoji}‍️‼-㊙\W]+/gu, '').trim();
      return;
    }

    // E. O resto vira DESCRIÇÃO
    if (line.length > 2) {
      descriptionLines.push(line);
    }
  });

  // Fallback: se não achou nome, usa a primeira linha da descrição
  if (!product_name && descriptionLines.length > 0) {
    product_name = descriptionLines.shift()!.replace(/^[\p{Emoji}\W]+/gu, '').trim();
  }

  return { product_name, price, link, coupon, description: descriptionLines.join('\n') };
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPromotions, setTotalPromotions] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [pasteText, setPasteText] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const formTop = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const loadPromotions = async (pageParam = 1, searchParam = '') => {
    try {
      const q = searchParam ? `&q=${encodeURIComponent(searchParam)}` : '';
      const response = await fetch(`/api/promotions?page=${pageParam}&limit=${LIMIT}${q}`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const res: PromotionsResponse = await response.json();
      setPromotions(res.data || []);
      setTotalPromotions(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || pageParam);
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
      toast.show('Erro ao carregar promoções', 'error');
    }
  };

  useEffect(() => {
    // Checa sessão no servidor ao montar
    (async () => {
      try {
        const res = await fetch('/api/auth');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
            loadPromotions(1, '');
          }
        }
      } catch (err) {
        console.error('Erro checando sessão:', err);
      } finally {
        setCheckingSession(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      // Validação server-side; a rota /api/auth cria um cookie httpOnly assinado
      const res = await fetch('/api/auth', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        setPassword('');
        loadPromotions(1, search);
      } else {
        toast.show('Senha incorreta!', 'error');
      }
    } catch (err) {
      console.error('Erro ao autenticar:', err);
      toast.show('Erro ao autenticar', 'error');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' });
    } catch (err) {
      console.error('Erro no logout:', err);
    }
    setIsAuthenticated(false);
    setPromotions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'image') setImageFailed(false);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAutofill = () => {
    const raw = pasteText.trim();
    if (!raw) {
      toast.show('Cole o texto da postagem para auto-preencher.', 'error');
      return;
    }
    const parsed = parsePostText(raw);
    const found = Object.values(parsed).filter(Boolean).length;
    setFormData((prev) => ({
      ...prev,
      product_name: parsed.product_name || prev.product_name,
      price: parsed.price || prev.price,
      link: parsed.link || prev.link,
      coupon: parsed.coupon || prev.coupon,
      description: parsed.description || prev.description,
    }));
    toast.show(
      found ? `${found} campo(s) preenchido(s). Confira antes de salvar.` : 'Nada reconhecido no texto',
      found ? 'success' : 'error',
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setPasteText('');
    setImageFailed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const action = editingId ? 'update' : 'add';
      const response = await fetch('/api/promotions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          promotion: editingId ? { id: editingId, ...formData } : formData,
        }),
      });
      const resJson = await response.json().catch(() => null);

      if (response.status === 401) {
        toast.show('Sessão expirada. Faça login novamente.', 'error');
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) {
        console.error('save error response:', resJson);
        toast.show(resJson?.error || 'Erro ao salvar promoção', 'error');
        return;
      }
      toast.show(editingId ? 'Promoção atualizada!' : 'Promoção adicionada!');
      const wasEditing = editingId;
      resetForm();
      loadPromotions(wasEditing ? page : 1, search);
    } catch (error) {
      console.error('Erro:', error);
      toast.show('Erro ao salvar promoção', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setImageFailed(false);
    setFormData({
      product_name: promo.product_name || '',
      price: promo.price || '',
      image: promo.image || '',
      link: promo.link || '',
      coupon: promo.coupon || '',
      description: promo.description || '',
    });
    formTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDelete = async (promo: Promotion) => {
    if (!confirm(`Deletar "${promo.product_name}"?`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', promotion: { id: promo.id } }),
      });
      const resJson = await response.json().catch(() => null);

      if (response.status === 401) {
        toast.show('Sessão expirada. Faça login novamente.', 'error');
        setIsAuthenticated(false);
        return;
      }
      if (!response.ok) {
        console.error('delete error response:', resJson);
        toast.show('Erro ao deletar promoção', 'error');
        return;
      }
      toast.show('Promoção deletada');
      if (editingId === promo.id) resetForm();
      // Volta uma página se apagou o último item da página atual
      const targetPage = promotions.length === 1 && page > 1 ? page - 1 : page;
      loadPromotions(targetPage, search);
    } catch (error) {
      console.error('Erro:', error);
      toast.show('Erro ao deletar promoção', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchTerm.trim());
    loadPromotions(1, searchTerm.trim());
  };

  if (checkingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950">
        <LoaderCircle className="size-6 animate-spin text-brand-300" aria-label="Carregando" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-slate-950 p-4">
        <div className="bg-grid absolute inset-0 -z-10 mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute left-1/2 top-1/3 -z-10 h-96 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600/25 blur-3xl" />

        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo dark />
          </div>
          <div className="rounded-2xl bg-white p-8 shadow-2xl shadow-black/40">
            <span className="mb-5 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Lock className="size-6" aria-hidden />
            </span>
            <h1 className="text-xl font-bold text-slate-900">Área administrativa</h1>
            <p className="mt-1 text-sm text-slate-500">Digite a senha para gerenciar as promoções.</p>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label htmlFor="password" className={labelClass}>
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  autoComplete="current-password"
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={loggingIn || !password}
                className={`${primaryButton} w-full`}
              >
                {loggingIn && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                {loggingIn ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
          <Link
            href="/"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Voltar para o site
          </Link>
        </div>
        {toast.element}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Ir para o site">
            <Logo suffix="Admin" />
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="size-4" aria-hidden />
            Sair
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Formulário */}
          <div ref={formTop} className={`${panelClass} scroll-mt-24`}>
            <div className="mb-6 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                {editingId ? <Pencil className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Editar promoção' : 'Nova promoção'}
                </h2>
                <p className="text-sm text-slate-500">
                  {editingId ? 'Altere os campos e salve.' : 'Preencha os campos ou cole o texto do post.'}
                </p>
              </div>
            </div>

            {!editingId && (
              <div className="mb-6 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4">
                <label htmlFor="paste" className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <WandSparkles className="size-4 text-brand-600" aria-hidden />
                  Auto-preencher a partir do post
                </label>
                <textarea
                  id="paste"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Cole aqui o texto completo do post..."
                  rows={4}
                  className={`${inputClass} mb-3`}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleAutofill} className={primaryButton}>
                    <WandSparkles className="size-4" aria-hidden />
                    Preencher campos
                  </button>
                  {pasteText && (
                    <button type="button" onClick={() => setPasteText('')} className={secondaryButton}>
                      Limpar texto
                    </button>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="product_name" className={labelClass}>
                  Nome do produto <span className="text-red-500">*</span>
                </label>
                <input
                  id="product_name"
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  placeholder="Ex: Mouse Logitech G305"
                  required
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className={labelClass}>
                    Preço <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="price"
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="Ex: R$ 179,90"
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="coupon" className={labelClass}>
                    Cupom
                  </label>
                  <input
                    id="coupon"
                    type="text"
                    name="coupon"
                    value={formData.coupon}
                    onChange={handleInputChange}
                    placeholder="Ex: PROMO15"
                    className={`${inputClass} font-mono`}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="image" className={labelClass}>
                  URL da imagem <span className="text-red-500">*</span>
                </label>
                <div className="flex items-start gap-3">
                  <input
                    id="image"
                    type="url"
                    name="image"
                    value={formData.image}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    required
                    className={inputClass}
                  />
                  <div className="grid size-10.5 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200">
                    {formData.image && !imageFailed ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.image}
                        alt="Prévia"
                        className="size-full object-contain"
                        onError={() => setImageFailed(true)}
                      />
                    ) : (
                      <ImageIcon className="size-5" aria-hidden />
                    )}
                  </div>
                </div>
                {imageFailed && (
                  <p className="mt-1.5 text-sm text-red-600">Não foi possível carregar essa imagem.</p>
                )}
              </div>

              <div>
                <label htmlFor="link" className={labelClass}>
                  Link da oferta <span className="text-red-500">*</span>
                </label>
                <input
                  id="link"
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="description" className={labelClass}>
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Detalhes, frete, instruções do cupom..."
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className={`${primaryButton} flex-1`}>
                  {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                  {loading ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar promoção'}
                </button>
                {(editingId || Object.values(formData).some(Boolean)) && (
                  <button type="button" onClick={resetForm} className={secondaryButton}>
                    {editingId ? 'Cancelar' : 'Limpar'}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Promoções */}
          <div className={panelClass}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Promoções</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-600">
                {totalPromotions}
              </span>
            </div>
            <form onSubmit={handleSearch} className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="text"
                inputMode="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar e pressionar Enter..."
                aria-label="Pesquisar promoções"
                className={`${inputClass} pl-9 pr-9`}
              />
              {(searchTerm || search) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSearch('');
                    loadPromotions(1, '');
                  }}
                  className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Limpar pesquisa"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </form>

            {promotions.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center text-slate-500">
                <PackageOpen className="mb-3 size-8 text-slate-300" strokeWidth={1.5} aria-hidden />
                <p className="text-sm">Nenhuma promoção encontrada.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {promotions.map((promo) => {
                  const dateLabel = formatPromotionDate(getPromotionDate(promo));
                  return (
                    <li
                      key={promo.id}
                      className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition ${
                        editingId === promo.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200/70">
                        {promo.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={promo.image} alt="" className="size-full object-contain" loading="lazy" />
                        ) : (
                          <ImageIcon className="size-5" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-semibold text-slate-900" title={promo.product_name}>
                          {promo.product_name}
                        </h3>
                        <p className="mt-0.5 text-sm text-slate-600">
                          <span className="font-semibold">{promo.price}</span>
                          {dateLabel && <span className="text-slate-400"> · {dateLabel}</span>}
                        </p>
                        {promo.coupon && (
                          <p className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs text-deal-700">
                            <TicketPercent className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate font-mono">{promo.coupon}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => handleEdit(promo)}
                          className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-brand-50 hover:text-brand-600"
                          aria-label={`Editar ${promo.product_name}`}
                          title="Editar"
                        >
                          <Pencil className="size-4" aria-hidden />
                        </button>
                        <button
                          onClick={() => handleDelete(promo)}
                          disabled={loading}
                          className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          aria-label={`Deletar ${promo.product_name}`}
                          title="Deletar"
                        >
                          <Trash className="size-4" aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-6">
              <Pagination page={page} totalPages={totalPages} onChange={(p) => loadPromotions(p, search)} />
            </div>
          </div>
        </div>
      </div>
      {toast.element}
    </div>
  );
}
