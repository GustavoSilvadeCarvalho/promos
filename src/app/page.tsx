'use client';

import React, { useEffect, useState } from 'react';
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

function linkify(text: string | undefined | null): React.ReactNode {
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
          className="text-blue-600 underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export default function Home() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const LIMIT = 10;

  useEffect(() => {
    const fetchPromotions = async () => {
      setLoading(true);
      try {
        const q = search ? `&q=${encodeURIComponent(search)}` : '';
        const response = await fetch(`/api/promotions?page=${page}&limit=${LIMIT}${q}`);
        const res = await response.json();
        setPromotions(res.data || []);
        setTotalPages(res.totalPages || 1);
      } catch (error) {
        console.error('Erro ao carregar promoções:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [page, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="sticky top-0 w-full bg-white shadow-md z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            Setup no Precinho
          </Link>
          <div className="flex gap-4">
            <Link
              href="/admin"
              className="text-gray-700 hover:text-blue-600 transition font-semibold text-sm"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Melhores Preços e Cupons</h1>
          <p className="text-lg opacity-90">Encontre os melhores códigos de desconto e promoções especiais</p>
        </div>
      </section>

      {/* Promotions Grid */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Search */}
          <div className="mb-6 flex gap-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={() => {
                setSearch(searchTerm.trim());
                setPage(1);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Pesquisar
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setSearch('');
                setPage(1);
              }}
              className="px-4 py-2 bg-gray-100 rounded-lg"
            >
              Limpar
            </button>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Carregando promoções...</p>
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">Nenhuma promoção disponível no momento</p>
            </div>
          ) : (
            <div className="space-y-6">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden border border-gray-100"
                >
                  <div className="grid md:grid-cols-4 gap-6 p-6 items-center">
                    {/* Imagem */}
                    <div className="md:col-span-1 flex justify-center">
                      <img
                        src={promo.image}
                        alt={promo.product_name}
                        className="w-40 h-40 object-cover rounded-lg"
                      />
                    </div>

                    {/* Informações */}
                    <div className="md:col-span-2">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {promo.product_name}
                      </h3>
                      <p className="text-gray-600 mb-4">{linkify(promo.description)}</p>

                      {/* Preço */}
                      <div className="mb-4">
                        <span className="text-3xl font-bold text-blue-600">
                          {promo.price}
                        </span>
                      </div>

                      {/* Cupom */}
                      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 inline-block">
                        <p className="text-sm text-gray-600 mb-1">Código do Cupom:</p>
                        <p className="text-xl font-bold text-blue-600 tracking-wider">
                          {promo.coupon}
                        </p>
                      </div>
                    </div>

                    {/* Botão */}
                    <div className="md:col-span-1 flex flex-col gap-3">
                      <a
                        href={promo.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold text-center"
                      >
                        Ver Oferta
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(promo.coupon);
                          alert('Cupom copiado!');
                        }}
                        className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg hover:bg-blue-50 transition font-semibold"
                      >
                        Copiar Cupom
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
              >
                →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <p>&copy; 2026 SetupnoPrecinho. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
