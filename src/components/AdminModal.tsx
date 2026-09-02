import React, { useState } from 'react';
import { Gift, GiftOrder, Rsvp } from '../types';
import { formatBRL, formatDateBR, exportToCSV, cleanPhoneBR } from '../utils/formatters';
import { adminGiftsAction, checkStripeStatus, adminUpdateOrderStatus } from '../services/api';
import { X, Lock, Gift as GiftIcon, Users, ShoppingBag, Settings, Plus, Edit2, Trash2, Download, Check, AlertCircle, Phone, MessageSquare, ExternalLink, Clock } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  gifts: Gift[];
  rsvps: Rsvp[];
  orders: GiftOrder[];
  onRefreshData: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  gifts,
  rsvps,
  orders,
  onRefreshData,
}) => {
  if (!isOpen) return null;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminCodeInput, setAdminCodeInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState<'gifts' | 'rsvps' | 'orders' | 'settings'>('gifts');

  // Gift Form state
  const [editingGift, setEditingGift] = useState<Partial<Gift> | null>(null);
  const [giftFormName, setGiftFormName] = useState('');
  const [giftFormPrice, setGiftFormPrice] = useState('');
  const [giftFormDesc, setGiftFormDesc] = useState('');
  const [giftFormCategory, setGiftFormCategory] = useState('Casa');
  const [giftFormUnique, setGiftFormUnique] = useState(true);
  const [giftFormActive, setGiftFormActive] = useState(true);
  const [giftFormSort, setGiftFormSort] = useState('0');
  const [giftFormError, setGiftFormError] = useState('');
  const [giftFormSuccess, setGiftFormSuccess] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Filters
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'attending' | 'not_attending'>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'awaiting_confirmation' | 'approved' | 'rejected'>('all');

  // Diagnostic state
  const [stripeDiagnostic, setStripeDiagnostic] = useState<{ configured: boolean; prefix?: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await adminGiftsAction(adminCodeInput, 'list');
      setIsAuthenticated(true);
      checkStripeStatus().then(setStripeDiagnostic);
    } catch (err: any) {
      setAuthError(err.message || 'Código de acesso incorreto.');
    }
  };

  const handleOpenGiftForm = (gift?: Gift) => {
    if (gift) {
      setEditingGift(gift);
      setGiftFormName(gift.name);
      setGiftFormPrice(String(gift.price_cents / 100));
      setGiftFormDesc(gift.description || '');
      setGiftFormCategory(gift.category || 'Casa');
      setGiftFormUnique(gift.unique_item);
      setGiftFormActive(gift.active !== false);
      setGiftFormSort(String(gift.sort_order || 0));
    } else {
      setEditingGift({ id: '' });
      setGiftFormName('');
      setGiftFormPrice('');
      setGiftFormDesc('');
      setGiftFormCategory('Casa');
      setGiftFormUnique(true);
      setGiftFormActive(true);
      setGiftFormSort(String(gifts.length + 1));
    }
    setGiftFormError('');
    setGiftFormSuccess('');
  };

  const handleSaveGift = async () => {
    setGiftFormError('');
    setGiftFormSuccess('');

    const priceNum = parseFloat(giftFormPrice);
    if (!giftFormName.trim() || isNaN(priceNum) || priceNum <= 0) {
      setGiftFormError('Preencha o nome e um preço válido em Reais.');
      return;
    }

    setLoadingAction(true);
    try {
      const payload: Partial<Gift> = {
        id: editingGift?.id || undefined,
        name: giftFormName.trim(),
        price_cents: Math.round(priceNum * 100),
        description: giftFormDesc.trim(),
        category: giftFormCategory,
        unique_item: giftFormUnique,
        active: giftFormActive,
        sort_order: parseInt(giftFormSort, 10) || 0,
      };

      const action = editingGift?.id ? 'update' : 'create';
      await adminGiftsAction(adminCodeInput, action, payload);
      setGiftFormSuccess(editingGift?.id ? 'Presente atualizado com sucesso!' : 'Presente adicionado com sucesso!');
      setEditingGift(null);
      onRefreshData();
    } catch (err: any) {
      setGiftFormError(err.message || 'Erro ao salvar presente.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteGift = async (id: string) => {
    if (!confirm('Deseja realmente remover este presente do catálogo?')) return;
    setLoadingAction(true);
    try {
      await adminGiftsAction(adminCodeInput, 'delete', { id });
      onRefreshData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir presente.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleOrderStatus = async (orderId: string, newStatus: 'approved' | 'rejected' | 'pending' | 'awaiting_confirmation') => {
    setLoadingAction(true);
    try {
      await adminUpdateOrderStatus(adminCodeInput, orderId, newStatus);
      onRefreshData();
    } catch (e: any) {
      alert(e.message || 'Erro ao alterar status do pedido.');
    } finally {
      setLoadingAction(false);
    }
  };

  // CSV Exports
  const handleExportRsvps = () => {
    const data = rsvps.map(r => ({
      Nome: r.name,
      WhatsApp: r.phone || '',
      Presença: r.attending ? 'Confirmado (SIM)' : 'Não comparecerá',
      Recado: r.message || '',
      Data_Confirmacao: formatDateBR(r.created_at),
    }));
    exportToCSV('rsvps-confirmacoes-iasmin-e-gutenberg.csv', data);
  };

  const handleExportOrders = () => {
    const data = orders.map(o => ({
      ID_Pedido: o.id,
      Presente_ID: o.gift_id,
      Comprador: o.buyer_name,
      Valor_Total: (o.amount_cents / 100).toFixed(2),
      Metodo: o.payment_method,
      Status: o.status,
      Mensagem_Carinho: o.buyer_message || '',
      Data: formatDateBR(o.created_at),
    }));
    exportToCSV('pedidos-presentes-casamento.csv', data);
  };

  const filteredRsvps = rsvps.filter(r => {
    if (rsvpFilter === 'attending') return r.attending;
    if (rsvpFilter === 'not_attending') return !r.attending;
    return true;
  });

  const totalConfirmedPeople = rsvps.filter(r => r.attending).length;

  const countAwaiting = orders.filter(o => o.status === 'awaiting_confirmation' || o.status === 'pending').length;
  const countApproved = orders.filter(o => o.status === 'approved').length;
  const countRejected = orders.filter(o => o.status === 'rejected').length;

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'awaiting_confirmation') return o.status === 'awaiting_confirmation' || o.status === 'pending';
    if (orderFilter === 'approved') return o.status === 'approved';
    if (orderFilter === 'rejected') return o.status === 'rejected';
    return true;
  });

  const totalRaisedCents = orders
    .filter(o => o.status === 'approved')
    .reduce((sum, o) => sum + (o.amount_cents || 0), 0);

  const totalAwaitingCents = orders
    .filter(o => o.status === 'awaiting_confirmation' || o.status === 'pending')
    .reduce((sum, o) => sum + (o.amount_cents || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A2E22]/50 backdrop-blur-xs animate-fade-in">
      <div
        className="relative bg-[#FCF9F3] border border-[#3A2E22]/15 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#3A2E22]/10 flex items-center justify-between bg-[#EFE3D0]/40">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#C67C4E]" />
            <h3 className="font-serif-display text-xl font-semibold text-[#3A2E22]">
              Painel dos Noivos
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7A6A57] hover:text-[#3A2E22] transition-colors p-1 cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isAuthenticated ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="max-w-sm mx-auto py-6">
              <p className="text-sm text-[#7A6A57] mb-4 text-center">
                Digite a senha de administrador (padrão: <code>casamento2026</code>)
              </p>
              <div className="mb-4">
                <input
                  type="password"
                  value={adminCodeInput}
                  onChange={e => setAdminCodeInput(e.target.value)}
                  placeholder="Código de acesso..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                />
              </div>

              {authError && (
                <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md text-center">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-md bg-[#C67C4E] hover:bg-[#A25A32] text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Entrar no Painel
              </button>
            </form>
          ) : (
            /* Authenticated Portal */
            <div>
              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-[#3A2E22]/15 mb-6 overflow-x-auto pb-1">
                <button
                  onClick={() => { setActiveTab('gifts'); setEditingGift(null); }}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'gifts'
                      ? 'bg-[#C67C4E] text-white'
                      : 'text-[#7A6A57] hover:text-[#3A2E22]'
                  }`}
                >
                  <GiftIcon className="w-3.5 h-3.5" />
                  <span>Presentes ({gifts.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('rsvps')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'rsvps'
                      ? 'bg-[#C67C4E] text-white'
                      : 'text-[#7A6A57] hover:text-[#3A2E22]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Confirmações ({totalConfirmedPeople} pessoas)</span>
                </button>

                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'orders'
                      ? 'bg-[#C67C4E] text-white'
                      : 'text-[#7A6A57] hover:text-[#3A2E22]'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Pedidos &amp; Pagamentos ({orders.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-t-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'bg-[#C67C4E] text-white'
                      : 'text-[#7A6A57] hover:text-[#3A2E22]'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Diagnóstico</span>
                </button>
              </div>

              {/* ================= TAB 1: GIFTS CRUD ================= */}
              {activeTab === 'gifts' && (
                <div>
                  {editingGift ? (
                    /* Edit / Add Gift Form */
                    <div className="bg-[#EFE3D0]/50 border border-[#3A2E22]/15 rounded-md p-5 mb-6 animate-fade-in">
                      <h4 className="font-serif-display text-lg font-semibold text-[#3A2E22] mb-4">
                        {editingGift.id ? 'Editar Presente' : 'Novo Presente no Catálogo'}
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#7A6A57] uppercase mb-1">
                            Nome do Presente *
                          </label>
                          <input
                            type="text"
                            value={giftFormName}
                            onChange={e => setGiftFormName(e.target.value)}
                            placeholder="Ex: Jogo de panelas"
                            className="w-full px-3 py-2 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#7A6A57] uppercase mb-1">
                            Preço sugerido (R$) *
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={giftFormPrice}
                            onChange={e => setGiftFormPrice(e.target.value)}
                            placeholder="Ex: 350"
                            className="w-full px-3 py-2 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#7A6A57] uppercase mb-1">
                            Categoria
                          </label>
                          <select
                            value={giftFormCategory}
                            onChange={e => setGiftFormCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                          >
                            <option value="Cozinha">Cozinha</option>
                            <option value="Eletros">Eletroportáteis</option>
                            <option value="Quarto">Quarto</option>
                            <option value="Banho">Banho</option>
                            <option value="Casa">Casa & Decoração</option>
                            <option value="Lazer">Lazer</option>
                            <option value="Lua de Mel">Cotas Lua de Mel</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#7A6A57] uppercase mb-1">
                            Ordem de exibição
                          </label>
                          <input
                            type="number"
                            value={giftFormSort}
                            onChange={e => setGiftFormSort(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs font-semibold text-[#7A6A57] uppercase mb-1">
                          Descrição / Detalhes
                        </label>
                        <input
                          type="text"
                          value={giftFormDesc}
                          onChange={e => setGiftFormDesc(e.target.value)}
                          placeholder="Uma frase curta sobre o item"
                          className="w-full px-3 py-2 bg-white border border-[#3A2E22]/15 rounded-md text-sm text-[#3A2E22] focus:outline-none focus:border-[#C67C4E]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-6 mb-5">
                        <label className="flex items-center gap-2 text-xs font-medium text-[#3A2E22] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={giftFormUnique}
                            onChange={e => setGiftFormUnique(e.target.checked)}
                            className="w-4 h-4 text-[#C67C4E] rounded"
                          />
                          <span>Presente único (só pode ser comprado uma vez)</span>
                        </label>

                        <label className="flex items-center gap-2 text-xs font-medium text-[#3A2E22] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={giftFormActive}
                            onChange={e => setGiftFormActive(e.target.checked)}
                            className="w-4 h-4 text-[#C67C4E] rounded"
                          />
                          <span>Visível no site</span>
                        </label>
                      </div>

                      {giftFormError && (
                        <div className="mb-4 p-2 bg-red-50 text-red-700 text-xs rounded">
                          {giftFormError}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSaveGift}
                          disabled={loadingAction}
                          className="py-2 px-5 bg-[#C67C4E] hover:bg-[#A25A32] text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
                        >
                          {editingGift.id ? 'Salvar Alterações' : 'Adicionar Presente'}
                        </button>
                        <button
                          onClick={() => setEditingGift(null)}
                          className="text-xs text-[#7A6A57] hover:text-[#3A2E22] underline cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs text-[#7A6A57]">
                        Total de <strong>{gifts.length}</strong> presentes cadastrados.
                      </span>
                      <button
                        onClick={() => handleOpenGiftForm()}
                        className="py-2 px-4 rounded-md bg-[#5C6748] hover:bg-[#485337] text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Novo Presente</span>
                      </button>
                    </div>
                  )}

                  {/* Gifts List */}
                  <div className="space-y-2">
                    {gifts.map(g => (
                      <div
                        key={g.id}
                        className={`p-3.5 rounded-md border flex items-center justify-between gap-3 ${
                          g.active === false
                            ? 'bg-[#FCF9F3]/60 border-[#3A2E22]/10 opacity-60'
                            : 'bg-white border-[#3A2E22]/15'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm text-[#3A2E22]">{g.name}</strong>
                            <span className="text-xs font-bold text-[#A25A32] font-serif-display">
                              {formatBRL(g.price_cents)}
                            </span>
                            {g.order_status === 'approved' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C67C4E]/15 text-[#A25A32] font-semibold">
                                Presenteado ({g.buyer_name || 'Convidado'})
                              </span>
                            )}
                            {(g.order_status === 'awaiting_confirmation' || (g.unique_item && g.order_status === 'pending')) && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-amber-700" />
                                Aguardando confirmação ({g.buyer_name || 'Convidado'})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#7A6A57] line-clamp-1 mt-0.5">
                            {g.description || 'Sem descrição'} · Categoria: {g.category || 'Casa'} · {g.unique_item ? 'Item único' : 'Cota flexível'} · Ordem: {g.sort_order || 0}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenGiftForm(g)}
                            className="p-1.5 rounded border border-[#3A2E22]/15 text-[#7A6A57] hover:text-[#3A2E22] hover:border-[#C67C4E] transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGift(g.id)}
                            className="p-1.5 rounded border border-[#3A2E22]/15 text-red-600 hover:border-red-400 transition-all cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= TAB 2: RSVPS ================= */}
              {activeTab === 'rsvps' && (
                <div>
                  <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setRsvpFilter('all')}
                        className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${
                          rsvpFilter === 'all'
                            ? 'bg-[#C67C4E] text-white border-[#C67C4E]'
                            : 'bg-white text-[#7A6A57] border-[#3A2E22]/15'
                        }`}
                      >
                        Todos ({rsvps.length})
                      </button>
                      <button
                        onClick={() => setRsvpFilter('attending')}
                        className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${
                          rsvpFilter === 'attending'
                            ? 'bg-[#5C6748] text-white border-[#5C6748]'
                            : 'bg-white text-[#7A6A57] border-[#3A2E22]/15'
                        }`}
                      >
                        Confirmados ({totalConfirmedPeople} pessoas)
                      </button>
                      <button
                        onClick={() => setRsvpFilter('not_attending')}
                        className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${
                          rsvpFilter === 'not_attending'
                            ? 'bg-[#A25A32] text-white border-[#A25A32]'
                            : 'bg-white text-[#7A6A57] border-[#3A2E22]/15'
                        }`}
                      >
                        Não vão ({rsvps.filter(r => !r.attending).length})
                      </button>
                    </div>

                    <button
                      onClick={handleExportRsvps}
                      className="py-1.5 px-3 rounded border border-[#3A2E22]/15 bg-white text-xs font-semibold text-[#3A2E22] hover:border-[#C67C4E] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar CSV</span>
                    </button>
                  </div>

                  {filteredRsvps.length === 0 ? (
                    <p className="text-center py-8 text-xs text-[#7A6A57]">Nenhuma confirmação encontrada.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredRsvps.map(r => {
                        const cleanDigits = cleanPhoneBR(r.phone || '');
                        const waLink = cleanDigits ? `https://wa.me/55${cleanDigits}?text=${encodeURIComponent(`Olá ${r.name}, aqui é do casamento de Iasmin & Gutenberg!`)}` : null;

                        return (
                          <div
                            key={r.id}
                            className="p-3.5 bg-white border border-[#3A2E22]/15 rounded-md flex flex-col gap-1.5 text-xs shadow-2xs"
                          >
                            <div className="flex justify-between items-center">
                              <strong className="text-sm text-[#3A2E22]">{r.name}</strong>
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-semibold ${
                                  r.attending
                                    ? 'bg-[#7C8862]/15 text-[#5C6748]'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {r.attending ? 'Confirmado individual' : 'Não vai'}
                              </span>
                            </div>

                            {/* Phone / WhatsApp bar */}
                            <div className="flex items-center gap-3 text-[#7A6A57]">
                              <div className="flex items-center gap-1 font-mono">
                                <Phone className="w-3.5 h-3.5 text-[#C67C4E]" />
                                <span>{r.phone || 'Sem telefone registrado'}</span>
                              </div>
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] text-[#5C6748] hover:text-[#3A2E22] font-semibold underline"
                                >
                                  <span>Abrir WhatsApp</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {r.message && (
                              <p className="text-[#7A6A57] italic bg-[#FCF9F3] p-2 rounded border border-[#3A2E22]/10 mt-0.5">
                                "{r.message}"
                              </p>
                            )}

                            <span className="text-[10px] text-[#7A6A57]/70 mt-0.5">
                              {formatDateBR(r.created_at)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 3: ORDERS ================= */}
              {activeTab === 'orders' && (
                <div>
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-white border border-[#3A2E22]/15 rounded-md">
                      <span className="text-[11px] text-[#7A6A57] uppercase font-semibold">Total Confirmado / Aprovado</span>
                      <p className="text-lg font-bold text-[#5C6748] font-serif-display mt-0.5">
                        {formatBRL(totalRaisedCents)}
                      </p>
                      <span className="text-[10px] text-[#7A6A57]">{countApproved} presente(s) confirmados</span>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-300/80 rounded-md">
                      <span className="text-[11px] text-amber-900 uppercase font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700" />
                        Aguardando Sua Confirmação
                      </span>
                      <p className="text-lg font-bold text-amber-900 font-serif-display mt-0.5">
                        {formatBRL(totalAwaitingCents)}
                      </p>
                      <span className="text-[10px] text-amber-800">{countAwaiting} presente(s) para conferir</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setOrderFilter('all')}
                        className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer ${
                          orderFilter === 'all' ? 'bg-[#C67C4E] text-white border-[#C67C4E]' : 'bg-white text-[#7A6A57] border-[#3A2E22]/15'
                        }`}
                      >
                        Todos ({orders.length})
                      </button>
                      <button
                        onClick={() => setOrderFilter('awaiting_confirmation')}
                        className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer flex items-center gap-1 ${
                          orderFilter === 'awaiting_confirmation'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-amber-900 border-amber-300'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>Aguardando ({countAwaiting})</span>
                      </button>
                      <button
                        onClick={() => setOrderFilter('approved')}
                        className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer ${
                          orderFilter === 'approved' ? 'bg-[#5C6748] text-white border-[#5C6748]' : 'bg-white text-[#7A6A57] border-[#3A2E22]/15'
                        }`}
                      >
                        Aprovados ({countApproved})
                      </button>
                      <button
                        onClick={() => setOrderFilter('rejected')}
                        className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer ${
                          orderFilter === 'rejected' ? 'bg-red-700 text-white border-red-700' : 'bg-white text-[#7A6A57] border-[#3A2E22]/15'
                        }`}
                      >
                        Recusados ({countRejected})
                      </button>
                    </div>

                    <button
                      onClick={handleExportOrders}
                      className="py-1.5 px-3 rounded border border-[#3A2E22]/15 bg-white text-xs font-semibold text-[#3A2E22] hover:border-[#C67C4E] flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Exportar CSV</span>
                    </button>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <p className="text-center py-8 text-xs text-[#7A6A57]">Nenhum pedido de presente nesta categoria.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map(o => {
                        const giftObj = gifts.find(g => g.id === o.gift_id);
                        const isAwaiting = o.status === 'awaiting_confirmation' || o.status === 'pending';
                        const isApproved = o.status === 'approved';
                        const isRejected = o.status === 'rejected';

                        return (
                          <div
                            key={o.id}
                            className={`p-4 bg-white border rounded-md flex flex-col gap-2.5 text-xs shadow-2xs ${
                              isAwaiting
                                ? 'border-amber-300 bg-amber-50/30'
                                : isApproved
                                ? 'border-[#7C8862]/30'
                                : 'border-red-200 opacity-75'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="text-sm font-semibold text-[#3A2E22]">
                                  {giftObj ? giftObj.name : o.gift_id}
                                </h5>
                                <span className="font-bold text-[#A25A32] font-serif-display text-base">
                                  {formatBRL(o.amount_cents)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#FCF9F3] border border-[#3A2E22]/15 rounded text-[#7A6A57]">
                                  {o.payment_method === 'mercadopago' ? 'Mercado Pago (12x)' : (o.payment_method === 'card' || o.payment_method === 'stripe' ? 'Cartão Stripe' : 'Pix Instantâneo')}
                                </span>
                                {isApproved && (
                                  <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-[#7C8862]/15 text-[#5C6748]">
                                    ✓ Aprovado / Confirmado
                                  </span>
                                )}
                                {isAwaiting && (
                                  <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-700" />
                                    Aguardando Confirmação
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-2.5 py-0.5 rounded-full font-semibold text-[11px] bg-red-100 text-red-700">
                                    ✕ Recusado / Liberado
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-[#3A2E22]">
                              Comprador: <strong>{o.buyer_name}</strong>
                            </p>

                            {o.buyer_message && (
                              <p className="text-[#7A6A57] italic bg-[#FCF9F3] p-2.5 rounded border border-[#3A2E22]/10">
                                "{o.buyer_message}"
                              </p>
                            )}

                            <div className="flex flex-wrap justify-between items-center border-t border-[#3A2E22]/10 pt-2.5 text-[10px] text-[#7A6A57] gap-2">
                              <span>ID: {o.id} · {formatDateBR(o.created_at)}</span>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2">
                                {isAwaiting && (
                                  <>
                                    <button
                                      onClick={() => handleToggleOrderStatus(o.id, 'approved')}
                                      disabled={loadingAction}
                                      className="px-3 py-1.5 bg-[#5C6748] hover:bg-[#485337] text-white rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Aprovar Pix (Confirmar)</span>
                                    </button>
                                    <button
                                      onClick={() => handleToggleOrderStatus(o.id, 'rejected')}
                                      disabled={loadingAction}
                                      className="px-2.5 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 rounded text-[11px] font-medium transition-all cursor-pointer"
                                      title="Libera o presente para outros convidados comprarem"
                                    >
                                      Recusar / Liberar Presente
                                    </button>
                                  </>
                                )}

                                {isApproved && (
                                  <>
                                    <button
                                      onClick={() => handleToggleOrderStatus(o.id, 'awaiting_confirmation')}
                                      disabled={loadingAction}
                                      className="px-2 py-1 border border-amber-300 text-amber-800 hover:bg-amber-50 rounded text-[10px] cursor-pointer"
                                    >
                                      Reverter p/ Aguardando
                                    </button>
                                    <button
                                      onClick={() => handleToggleOrderStatus(o.id, 'rejected')}
                                      disabled={loadingAction}
                                      className="px-2 py-1 border border-red-200 text-red-600 hover:bg-red-50 rounded text-[10px] cursor-pointer"
                                    >
                                      Cancelar / Liberar Presente
                                    </button>
                                  </>
                                )}

                                {isRejected && (
                                  <button
                                    onClick={() => handleToggleOrderStatus(o.id, 'approved')}
                                    disabled={loadingAction}
                                    className="px-3 py-1 bg-[#5C6748] text-white hover:bg-[#485337] rounded text-[11px] font-semibold cursor-pointer"
                                  >
                                    Reativar e Aprovar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 4: SETTINGS / DIAGNOSTIC ================= */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  {/* Mercado Pago */}
                  <div className="p-4 bg-white border border-[#3A2E22]/15 rounded-md text-xs">
                    <h5 className="font-semibold text-sm text-[#3A2E22] mb-2 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-[#009EE3]" />
                      <span>Mercado Pago (Cartão de Crédito em até 12x)</span>
                    </h5>
                    <div className="space-y-1.5 text-[#7A6A57]">
                      {stripeDiagnostic?.mercadopago?.configured ? (
                        <div className="text-[#5C6748] font-semibold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-[#5C6748]" />
                          <span>MERCADO_PAGO_ACCESS_TOKEN configurado ({stripeDiagnostic.mercadopago.prefix})</span>
                          {stripeDiagnostic.mercadopago.is_test && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded font-medium">Modo Sandbox/Teste</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-amber-700 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          <span>MERCADO_PAGO_ACCESS_TOKEN não detectado nas variáveis de ambiente.</span>
                        </div>
                      )}
                      <p className="text-[11px] text-[#7A6A57]">
                        Permite que os convidados parcelem o presente em até <strong>12 parcelas</strong> com toda a conveniência do Checkout Pro.
                      </p>
                    </div>
                  </div>

                  {/* Stripe */}
                  <div className="p-4 bg-white border border-[#3A2E22]/15 rounded-md text-xs">
                    <h5 className="font-semibold text-sm text-[#3A2E22] mb-2 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-[#635BFF]" />
                      <span>Stripe Checkout (Gateway Secundário)</span>
                    </h5>
                    <p className="text-[#7A6A57] mb-1">
                      {stripeDiagnostic?.stripe?.configured || stripeDiagnostic?.configured ? (
                        <span className="text-[#5C6748] font-semibold flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          STRIPE_SECRET_KEY detectada ({stripeDiagnostic?.stripe?.prefix || stripeDiagnostic?.prefix})
                        </span>
                      ) : (
                        <span className="text-[#7A6A57] flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                          STRIPE_SECRET_KEY não configurada.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Pix */}
                  <div className="p-4 bg-white border border-[#3A2E22]/15 rounded-md text-xs">
                    <h5 className="font-semibold text-sm text-[#3A2E22] mb-2 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#5C6748]" />
                      <span>Chave Pix Direta dos Noivos (0% Taxas)</span>
                    </h5>
                    <p className="text-[#7A6A57] leading-relaxed">
                      Chave: <strong>gutenberg23@gmail.com</strong><br />
                      Beneficiário: <strong>Iasmin e Gutenberg</strong><br />
                      Cidade: <strong>Rio de Janeiro</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
