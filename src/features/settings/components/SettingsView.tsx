import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  Download,
  Upload,
  Smartphone,
  Trash2,
  FileSpreadsheet,
  Plus,
  Share,
  PlusSquare,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  LogOut,
  Cloud,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { useCategories, useWorkspaceSettings, useAccounts, useTransactions } from '@/data/hooks';
import { categoryRepository, settingsRepository } from '@/data/repositories/local/localRepository';
import { exportTransactionsToExcel, exportTransactionsToCSV } from '@/shared/lib/export';
import { isStandalonePwa } from '@/shared/lib/pwa';
import { showToast } from '@/shared/ui/toastStore';
import { db } from '@/data/db';
import { useSessionStore } from '@/data/session';
import { signOutAndClearLocal } from '@/app/bootstrap';

export const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const { displayName, userEmail } = useSessionStore();
  const { categories } = useCategories();
  const { settings } = useWorkspaceSettings();
  const { accounts } = useAccounts();
  const { transactions } = useTransactions();

  // Category creation modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#22C55E');
  const newCatIcon = 'Tag';
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  // Native-style Install Guide, Logout & Danger Confirmation Sheets (zero browser alert/confirm)
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [clearConfirmStep, setClearConfirmStep] = useState<0 | 1 | 2>(0);

  // PWA Install prompt state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(isStandalonePwa());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const userInitial = (displayName || userEmail || 'F').trim().charAt(0).toUpperCase();

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast({ message: 'App instalado com sucesso!', type: 'success' });
      }
      setDeferredPrompt(null);
    } else {
      setIsInstallGuideOpen(true);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOutAndClearLocal();
      setIsLogoutConfirmOpen(false);
      showToast({ message: 'Você saiu da sua conta.', type: 'info' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleToggleCompetenceMode = async () => {
    const nextMode =
      settings?.competenceMode === 'invoice_month' ? 'purchase_date' : 'invoice_month';
    await settingsRepository.updateSettings({ competenceMode: nextMode });
    showToast({
      message: `Modo alterado para: ${nextMode === 'invoice_month' ? 'Mês da Fatura' : 'Data da Compra'}`,
      type: 'success',
    });
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      showToast({ message: 'Digite um nome para a categoria', type: 'error' });
      return;
    }

    await categoryRepository.create({
      name: newCatName.trim(),
      color: newCatColor,
      icon: newCatIcon,
      type: newCatType,
      archived: false,
    });

    showToast({ message: 'Categoria criada com sucesso!', type: 'success' });
    setIsCatModalOpen(false);
    setNewCatName('');
  };

  const handleExportJSON = async () => {
    const allData = {
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      accounts: await db.accounts.toArray(),
      budgets: await db.budgets.toArray(),
      recurringRules: await db.recurringRules.toArray(),
      settings: await db.settings.toArray(),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fecho_backup_${new Date().toISOString().substring(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({ message: 'Backup JSON baixado com sucesso!', type: 'success' });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (data.transactions && Array.isArray(data.transactions)) {
          await db.transactions.bulkPut(data.transactions);
        }
        if (data.categories && Array.isArray(data.categories)) {
          await db.categories.bulkPut(data.categories);
        }
        if (data.accounts && Array.isArray(data.accounts)) {
          await db.accounts.bulkPut(data.accounts);
        }
        if (data.budgets && Array.isArray(data.budgets)) {
          await db.budgets.bulkPut(data.budgets);
        }
        if (data.recurringRules && Array.isArray(data.recurringRules)) {
          await db.recurringRules.bulkPut(data.recurringRules);
        }

        showToast({ message: 'Backup restaurado com sucesso!', type: 'success' });
      } catch (err) {
        console.error(err);
        showToast({ message: 'Erro ao importar backup: arquivo inválido', type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  const executeClearAllData = async () => {
    await db.transactions.clear();
    await db.budgets.clear();
    await db.recurringRules.clear();
    setClearConfirmStep(0);
    showToast({ message: 'Todos os lançamentos locais foram apagados.', type: 'info' });
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-12">
      <MobileHeader>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[var(--text)] tracking-tight">Ajustes</h1>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--primary-bright)] px-2.5 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20">
            <Cloud className="w-3 h-3" />
            Sincronizado
          </span>
        </div>
      </MobileHeader>

      {/* Account Profile Card (iOS Settings Apple-ID style) */}
      <div className="rounded-3xl bg-[#141416] border border-white/[0.08] p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary-bright)] text-lg font-extrabold flex items-center justify-center shrink-0">
            {userInitial}
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold text-[var(--text)] truncate">
              {displayName || 'Minha Conta'}
            </div>
            <div className="text-xs text-[var(--text-muted)] truncate">
              {userEmail || 'Conta conectada'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-[var(--danger)] flex items-center gap-1.5 active:scale-95 transition-transform shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </div>

      {/* Navigation Shortcuts (iOS Inset Grouped List) */}
      <div className="rounded-3xl bg-[#141416] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
        <button
          type="button"
          onClick={() => navigate('/contas')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--primary)]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--text)]">Contas e Cartões</span>
              <p className="text-xs text-[var(--text-muted)]">Gerenciar contas e datas de faturas</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/orcamentos')}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--primary)]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--text)]">Limites de Orçamento</span>
              <p className="text-xs text-[var(--text-muted)]">Metas por categoria e mês</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>

      {/* Preferences Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
          Preferências de Cálculo
        </h2>

        <Card className="p-4 flex items-center justify-between">
          <div className="flex flex-col pr-3">
            <span className="text-sm font-semibold text-[var(--text)]">Modo de Competência</span>
            <span className="text-xs text-[var(--text-muted)]">
              {settings?.competenceMode === 'invoice_month'
                ? 'Por Mês da Fatura (cartão de crédito)'
                : 'Por Data da Compra (padrão)'}
            </span>
          </div>

          <Button size="sm" variant="secondary" onClick={handleToggleCompetenceMode}>
            Alterar
          </Button>
        </Card>
      </div>

      {/* Categories Management */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Categorias ({categories.length})
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setIsCatModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {categories.slice(0, 8).map((cat) => (
            <div
              key={cat.id}
              className="p-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center gap-2"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: cat.color }}
              >
                <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium truncate text-[var(--text)]">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* App Installation */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
          Aplicativo Offline (PWA)
        </h2>

        <Card className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--primary)]">
              {isStandalone ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Smartphone className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-[var(--text)]">
                {isStandalone ? 'App Instalado' : 'Instalar no iPhone / Celular'}
              </span>
              <p className="text-xs text-[var(--text-muted)]">
                {isStandalone
                  ? 'Rodando em tela cheia offline'
                  : 'Abra sem barra do Safari com suporte à Dynamic Island'}
              </p>
            </div>
          </div>

          {!isStandalone && (
            <Button size="sm" variant="primary" onClick={handleInstallClick}>
              Instalar
            </Button>
          )}
        </Card>
      </div>

      {/* Backup and Data Export */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
          Dados e Backups
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="md" onClick={handleExportJSON}>
            <Download className="w-4 h-4 mr-2" />
            Backup JSON
          </Button>

          <label className="relative inline-flex items-center justify-center font-medium rounded-2xl transition-all active:scale-[0.98] select-none min-h-[44px] text-sm px-4 py-2.5 bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Restaurar JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <Button
            variant="secondary"
            size="md"
            onClick={() => exportTransactionsToExcel(transactions, categories, accounts)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2 text-[var(--primary)]" />
            Exportar Excel
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => exportTransactionsToCSV(transactions, categories, accounts)}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border)]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--danger)] px-1">
          Zona de Perigo
        </h2>

        <Button variant="danger" size="md" onClick={() => setClearConfirmStep(1)}>
          <Trash2 className="w-4 h-4 mr-2" />
          Apagar Todos os Lançamentos
        </Button>
      </div>

      {/* Logout Confirmation Sheet */}
      <Sheet
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        title="Sair da conta?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Seus dados permanecem salvos com segurança na sua conta ({userEmail}). Ao sair, o cache
            local deste aparelho é limpo para proteger sua privacidade.
          </p>
          <Button
            variant="danger"
            size="lg"
            fullWidth
            isLoading={isLoggingOut}
            onClick={handleSignOut}
          >
            Confirmar e Sair
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={() => setIsLogoutConfirmOpen(false)}>
            Cancelar
          </Button>
        </div>
      </Sheet>

      {/* New Category Sheet */}
      <Sheet isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title="Nova Categoria">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Tipo</label>
            <div className="flex gap-2">
              <Button
                variant={newCatType === 'expense' ? 'primary' : 'secondary'}
                size="sm"
                fullWidth
                onClick={() => setNewCatType('expense')}
              >
                Despesa
              </Button>
              <Button
                variant={newCatType === 'income' ? 'primary' : 'secondary'}
                size="sm"
                fullWidth
                onClick={() => setNewCatType('income')}
              >
                Receita
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Nome</label>
            <input
              type="text"
              placeholder="Ex: Cripto, Viagens"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[46px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Cor</label>
            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar touch-pan-x overscroll-x-contain">
              {[
                '#22C55E',
                '#3B82F6',
                '#EF4444',
                '#F59E0B',
                '#8B5CF6',
                '#EC4899',
                '#06B6D4',
                '#EAB308',
                '#64748B',
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewCatColor(color)}
                  className={`w-9 h-9 rounded-full shrink-0 transition-transform ${
                    newCatColor === color ? 'scale-110 ring-2 ring-white' : 'opacity-80'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={handleCreateCategory} className="mt-2">
            Salvar Categoria
          </Button>
        </div>
      </Sheet>

      {/* Native Install Guide Sheet */}
      <Sheet
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
        title="Instalar o Fechô no Celular"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-2.5">
            <span className="text-xs font-bold text-[var(--primary-bright)] uppercase tracking-wider">
              iPhone (Safari — iOS)
            </span>
            <div className="flex items-start gap-2.5 text-sm text-[var(--text)]">
              <Share className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
              <span>
                1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-sm text-[var(--text)]">
              <PlusSquare className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
              <span>
                2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              3. Abra o ícone do Fechô pela Tela de Início para rodar em tela cheia com suporte à Dynamic Island.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-1.5">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Android (Chrome)
            </span>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Abra o menu (⋮) no navegador e toque em <strong className="text-[var(--text)]">Instalar aplicativo</strong> ou <strong className="text-[var(--text)]">Adicionar à tela inicial</strong>.
            </p>
          </div>

          <Button variant="primary" size="lg" fullWidth onClick={() => setIsInstallGuideOpen(false)}>
            Entendi
          </Button>
        </div>
      </Sheet>

      {/* Native 2-step Clear Data Confirmation Sheet */}
      <Sheet
        isOpen={clearConfirmStep > 0}
        onClose={() => setClearConfirmStep(0)}
        title={clearConfirmStep === 1 ? 'Apagar todos os dados?' : 'Confirmação final'}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/30">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text)] leading-relaxed">
              {clearConfirmStep === 1
                ? 'Você tem certeza de que deseja apagar TODOS os seus lançamentos, metas de orçamento e recorrências locais?'
                : 'Esta ação apaga permanentemente os registros locais deste aparelho.'}
            </p>
          </div>

          {clearConfirmStep === 1 ? (
            <Button variant="danger" size="lg" fullWidth onClick={() => setClearConfirmStep(2)}>
              Sim, continuar
            </Button>
          ) : (
            <Button variant="danger" size="lg" fullWidth onClick={executeClearAllData}>
              Confirmar e Apagar Tudo
            </Button>
          )}

          <Button variant="ghost" size="md" fullWidth onClick={() => setClearConfirmStep(0)}>
            Cancelar
          </Button>
        </div>
      </Sheet>
    </div>
  );
};
