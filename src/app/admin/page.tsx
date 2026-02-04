'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Promotion {
  id: number;
  product_name: string;
  price: string;
  image: string;
  link: string;
  coupon: string;
  description: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalPromotions, setTotalPromotions] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    product_name: '',
    price: '',
    image: '',
    link: '',
    coupon: '',
    description: '',
  });
  const [pasteText, setPasteText] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Envia a senha para validação server-side; a rota /api/auth cria um cookie httpOnly
    (async () => {
      try {
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
          alert('Senha incorreta!');
        }
      } catch (err) {
        console.error('Erro ao autenticar:', err);
        alert('Erro ao autenticar');
      }
    })();
  };

  const LIMIT = 10;

  const loadPromotions = async (pageParam: number = 1, searchParam: string = '') => {
    try {
      const q = searchParam ? `&q=${encodeURIComponent(searchParam)}` : '';
      const response = await fetch(`/api/promotions?page=${pageParam}&limit=${LIMIT}${q}`, { credentials: 'same-origin', cache: 'no-store' });
      const res = await response.json();
      setPromotions(res.data || []);
      setTotalPromotions(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || pageParam);
    } catch (error) {
      console.error('Erro ao carregar promoções:', error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const parsePasteText = () => {
    const raw = (pasteText || '').trim();
    if (!raw) return alert('Cole o texto da postagem para auto-preencher.');

    // 1. Quebra em linhas e remove linhas vazias
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let product_name = '';
    let price = '';
    let link = '';
    let coupon = '';
    let description = '';

    // Variável para juntar linhas de descrição
    const descriptionLines: string[] = [];

    // Regex auxiliares
    const linkRegex = /(https?:\/\/\S+)/i;
    // Detecta linha de preço mesmo com emoji antes (remove o ^ do inicio)
    const priceLineRegex = /(?:PRE\s?ÇO|R\$)\s*[:\s]\s*(?:R\$\s*)?([\d.,]+)/i;
    // Detecta linha de cupom
    const couponLineRegex = /(?:CUPOM|CÓDIGO)\s*[:\s]\s*(.*)/i;
    // Palavras que indicam que a linha NÃO é um nome de produto
    const ignoreNameRegex = /(?:PRE\s?ÇO|R\$|CUPOM|ENVIO|NO APP|MOEDAS|LINK|HTTP|⚠️|🇧🇷|💵|🎟|🔥)/i;

    lines.forEach((line) => {
      // A. Tenta extrair LINK (prioridade máxima)
      const linkMatch = line.match(linkRegex);
      if (linkMatch) {
        link = linkMatch[1];
        return; // Se é link, não é mais nada
      }

      // B. Tenta extrair PREÇO
      // Remove caracteres estranhos para facilitar a detecção (não utilizado diretamente)
      const priceMatch = line.match(priceLineRegex);

      if (priceMatch) {
        // 1. Pega só o número limpo (ex: "180" ou "1.200,90") capturado pelo regex
        const rawNumber = priceMatch[1] || line.replace(/[^0-9,.]/g, '');

        // 2. Adiciona o R$ na frente manualmente
        price = `R$ ${rawNumber.trim()}`;
        return;
      }

      // C. Tenta extrair CUPOM
      const couponMatch = line.match(couponLineRegex);
      if (couponMatch) {
        // Pega tudo o que vier depois de "Cupom:", incluindo as moedas
        // O match[1] já contém o resto da linha capturado pelo regex
        coupon = couponMatch[1].trim();
        return;
      }

      // D. Lógica para NOME DO PRODUTO vs DESCRIÇÃO
      // Se ainda não temos nome, e a linha não parece metadados (preço, cupom, envio), é o nome
      if (!product_name && !line.match(ignoreNameRegex) && line.length > 3) {
        // Remove emojis do inicio do nome para ficar limpo (ex: "🔥Microfone" vira "Microfone")
        product_name = line.replace(/^[\p{Emoji}\u200d\uFE0F\u203C-\u3299\W]+/gu, '').trim();
        return;
      }

      // E. O que sobrou vira DESCRIÇÃO (ex: "Envio do Brasil", instruções)
      // Ignora linhas muito curtas ou irrelevantes
      if (line.length > 2 && !line.includes('http')) {
        descriptionLines.push(line);
      }
    });

    // Fallback: Se não achou nome, tenta pegar a primeira linha válida da descrição
    if (!product_name && descriptionLines.length > 0) {
      product_name = descriptionLines[0].replace(/^[\p{Emoji}\W]+/gu, '').trim();
      descriptionLines.shift(); // Remove do array de descrição
    }

    // Formata descrição
    description = descriptionLines.join('\n');

    // Atualiza o estado
    setFormData((prev) => ({
      ...prev,
      product_name: product_name || prev.product_name,
      price: price || prev.price,
      link: link || prev.link,
      coupon: coupon || prev.coupon,
      description: description || prev.description,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const action = editingId ? 'update' : 'add';
      const response = await fetch('/api/promotions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, promotion: editingId ? { id: editingId, ...formData } : formData }),
      });

      const resJson = await response.json().catch(() => null);
      if (response.ok) {
        console.log('save response:', resJson);
        alert(editingId ? 'Promoção atualizada com sucesso!' : 'Promoção adicionada com sucesso!');
        setFormData({ product_name: '', price: '', image: '', link: '', coupon: '', description: '' });
        setEditingId(null);
        loadPromotions(1, search);
      } else {
        console.error('save error response:', resJson);
        alert('Erro ao salvar promoção');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar promoção');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setFormData({
      product_name: promo.product_name,
      price: promo.price,
      image: promo.image,
      link: promo.link,
      coupon: promo.coupon,
      description: promo.description,
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta promoção?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', promotion: { id } }),
      });

      const resJson = await response.json().catch(() => null);
      if (response.ok) {
        console.log('delete response:', resJson);
        alert('Promoção deletada com sucesso!');
        loadPromotions(page, search);
      } else {
        console.error('delete error response:', resJson);
        alert('Erro ao deletar promoção');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao deletar promoção');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      product_name: '',
      price: '',
      image: '',
      link: '',
      coupon: '',
      description: '',
    });
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
      }
    })();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            🔐 Acesso Admin
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Entrar
            </button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 font-semibold text-center block"
            >
              ← Voltar para Promoções
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 w-full bg-white shadow-md z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            🎁 Promos
          </Link>
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' });
              } catch (err) {
                console.error('Erro no logout:', err);
              }
              setIsAuthenticated(false);
              setPromotions([]);
            }}
            className="text-red-600 hover:text-red-700 transition font-semibold"
          >
            Sair
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Formulário */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingId ? 'Editar Promoção' : 'Adicionar Nova Promoção'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Colar texto da postagem (auto-preencher)
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Cole aqui o texto completo do post..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={parsePasteText}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    Preencher automaticamente
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasteText('')}
                    className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Limpar texto
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  placeholder="Ex: iPhone 15 Pro"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Preço
                </label>
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="Ex: R$ 7.999"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  URL da Imagem
                </label>
                <input
                  type="url"
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Link da Oferta
                </label>
                <input
                  type="url"
                  name="link"
                  value={formData.link}
                  onChange={handleInputChange}
                  placeholder="https://..."
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Código do Cupom
                </label>
                <input
                  type="text"
                  name="coupon"
                  value={formData.coupon}
                  onChange={handleInputChange}
                  placeholder="Ex: PROMO15"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descrição breve do produto"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Adicionar'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition font-semibold"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de Promoções */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Promoções Ativas ({totalPromotions})
            </h2>
            {/* Search (admin) */}
            <div className="mb-4 flex gap-2">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={() => {
                  setSearch(searchTerm.trim());
                  loadPromotions(1, searchTerm.trim());
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg"
              >
                Pesquisar
              </button>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearch('');
                  loadPromotions(1, '');
                }}
                className="px-3 py-2 bg-gray-100 rounded-lg"
              >
                Limpar
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {promo.product_name}
                      </h3>
                      <p className="text-sm text-gray-600">{promo.price}</p>
                      <p className="text-sm font-mono text-blue-600 mt-1">
                        {promo.coupon}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(promo)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition text-sm font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition text-sm font-semibold disabled:opacity-50"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Pagination (admin) */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center items-center gap-2">
                <button
                  onClick={() => loadPromotions(Math.max(1, page - 1), search)}
                  disabled={page === 1}
                  className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => loadPromotions(p, search)}
                    className={`px-2 py-1 rounded ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => loadPromotions(Math.min(totalPages, page + 1), search)}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
