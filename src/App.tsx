/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, X, Loader2, RotateCw } from 'lucide-react';

const API_URL = 'https://script.google.com/macros/s/AKfycbywoKViRHBSgFavtGI7LFixbJ9oKOnZPE_HfuI6NU8gAfBwxrdYh-8Y7YKKpup1Kcwd/exec';
const WEBHOOK_URL = 'https://vmi3144263.contaboserver.net/webhook/55d004de-ffe4-44ad-81bd-e41146d237e0';

interface Lead {
  rowIndex: number;
  nome: string;
  telefone: string;
  status: string;
  valor?: string;
  observacao?: string;
  [key: string]: any; // For other columns if any
}

const STATUS_OPTIONS = [
  'APRESENTAÇÃO',
  'NÃO ATENDE',
  'ORÇAMENTO',
  'FORA DE PERFIL',
  'EM PRODUÇÃO',
  'FECHOU'
  'PERDIDO'
];

export default function App() {
  const [sellers, setSellers] = useState<string[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states for modal
  const [status, setStatus] = useState('');
  const [tentativa, setTentativa] = useState('');
  const [dataTentativa, setDataTentativa] = useState('');
  const [valor, setValor] = useState('');
  const [observacao, setObservacao] = useState('');

  // Initial load: Get sellers
  useEffect(() => {
    const fetchSellers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}?action=getTabs`);
        const data = await response.json();
        if (Array.isArray(data)) {
          setSellers(data);
          // Removed auto-selection of first seller
        }
      } catch (error) {
        console.error('Error fetching sellers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSellers();
  }, []);

  // Load leads when seller changes
  useEffect(() => {
    if (!selectedSeller) return;

    const fetchLeads = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}?action=getLeads&sheet=${encodeURIComponent(selectedSeller)}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          // Sort by rowIndex descending to show most recent (last rows) first
          const sortedData = [...data].sort((a, b) => b.rowIndex - a.rowIndex);
          setLeads(sortedData);
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeads();
  }, [selectedSeller]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(lead => 
      lead.telefone?.toString().toLowerCase().includes(query) ||
      lead.nome?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setStatus(lead.status || '');
    setTentativa(lead.tentativa || '');
    setDataTentativa(lead.data || '');
    setValor(lead.valor || '');
    setObservacao(lead.observacao || '');
  };

  const handleUpdate = async () => {
    console.log('Botão Confirmar clicado');
    if (!selectedLead || !selectedSeller) {
      console.warn('Lead ou Vendedor não selecionado');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        action: 'updateLead',
        sheet: selectedSeller,
        rowIndex: selectedLead.rowIndex,
        status,
        tentativa,
        data: dataTentativa,
        valor,
        observacao
      };

      console.log('Enviando dados para o Webhook:', WEBHOOK_URL, payload);

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('Status da resposta:', response.status);

      const result = await response.json();
      console.log('Resultado do servidor:', result);

      if (result.ok === false) {
        throw new Error(result.message || 'Erro ao salvar lead no servidor');
      }

      console.log('Lead salvo com sucesso');
      alert('Lead atualizado com sucesso!');

      // Re-fetch leads to update list
      console.log('Atualizando lista de leads...');
      const refreshResponse = await fetch(`${API_URL}?action=getLeads&sheet=${encodeURIComponent(selectedSeller)}`);
      const data = await refreshResponse.json();
      if (Array.isArray(data)) {
        const sortedData = [...data].sort((a, b) => b.rowIndex - a.rowIndex);
        setLeads(sortedData);
      }

      setSelectedLead(null);
    } catch (error) {
      console.error('Erro detalhado ao enviar lead:', error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        alert('Erro de Conexão (CORS): O seu servidor Contabo bloqueou a requisição. Certifique-se de que o CORS está habilitado no servidor ou use um proxy.');
      } else {
        alert('Erro ao enviar lead: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setSelectedSeller('');
    setLeads([]);
    setSearchQuery('');
    try {
      // Re-fetch sellers
      const sellersResponse = await fetch(`${API_URL}?action=getTabs`);
      const sellersData = await sellersResponse.json();
      if (Array.isArray(sellersData)) {
        setSellers(sellersData);
      }
    } catch (error) {
      console.error('Error refreshing app:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white text-gray-900 font-sans flex flex-col max-w-md mx-auto border-x border-gray-100 shadow-sm overflow-hidden">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-3 space-y-2 shrink-0">
        <div className="flex items-center gap-2">
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className="flex-1 h-10 px-3 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
            disabled={isLoading}
          >
            <option value="">Selecione um vendedor</option>
            {sellers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50"
            title="Atualizar dados"
          >
            <RotateCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar telefone"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* LEADS LIST */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Carregando leads...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            Nenhum lead encontrado
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredLeads.map((lead) => (
              <button
                key={`${lead.rowIndex}-${lead.telefone}`}
                onClick={() => handleLeadClick(lead)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{lead.nome || 'Sem nome'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{lead.telefone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                    lead.status === 'CLIENTE' ? 'bg-green-100 text-green-700' :
                    lead.status === 'NÃO ATENDE' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {lead.status || 'NOVO'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* LEAD EDIT MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-lg">Editar Lead</h2>
              <button onClick={() => setSelectedLead(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</p>
                <p className="text-base font-medium">{selectedLead.nome}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Telefone</p>
                <p className="text-base font-medium">{selectedLead.telefone}</p>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um status</option>
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tentativa</label>
                    <input
                      type="number"
                      placeholder="Nº"
                      value={tentativa}
                      onChange={(e) => setTentativa(e.target.value)}
                      className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Data</label>
                    <input
                      type="date"
                      value={dataTentativa}
                      onChange={(e) => setDataTentativa(e.target.value)}
                      className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Observação</label>
                  <textarea
                    placeholder="Adicione uma nota..."
                    rows={3}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={handleUpdate}
                disabled={isSaving}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'CONFIRMAR'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
