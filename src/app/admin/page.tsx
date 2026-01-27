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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Verificação simples - para maior segurança, use autenticação real
    if (password === 'senha123') {
      setIsAuthenticated(true);
      setPassword('');
      loadPromotions();
    } else {
      alert('Senha incorreta!');
    }
  };

  const loadPromotions = async () => {
    try {
      const response = await fetch('/api/promotions');
      const data = await response.json();
      setPromotions(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const action = editingId ? 'update' : 'add';
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'senha123',
          action,
          promotion: editingId
            ? { id: editingId, ...formData }
            : formData,
        }),
      });

      if (response.ok) {
        alert(
          editingId
            ? 'Promoção atualizada com sucesso!'
            : 'Promoção adicionada com sucesso!'
        );
        setFormData({
          product_name: '',
          price: '',
          image: '',
          link: '',
          coupon: '',
          description: '',
        });
        setEditingId(null);
        loadPromotions();
      } else {
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: 'senha123',
          action: 'delete',
          promotion: { id },
        }),
      });

      if (response.ok) {
        alert('Promoção deletada com sucesso!');
        loadPromotions();
      } else {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
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
            onClick={() => setIsAuthenticated(false)}
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
                  required
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Promoções Ativas ({promotions.length})
            </h2>
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
          </div>
        </div>
      </div>
    </div>
  );
}
