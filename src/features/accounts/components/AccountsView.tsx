import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Building2, Plus, ArrowLeft, Check } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { BankLogo } from '@/shared/ui/BankLogo';
import { formatCentsToBRL } from '@/shared/lib/money';
import { getCurrentCompetence } from '@/shared/lib/dates';
import { calculateCardInvoiceCompetence } from '@/shared/lib/competence';
import { BRAZILIAN_BANKS, BankPreset, getBankById, matchBankByName } from '@/shared/lib/banks';
import { useAccounts, useTransactions } from '@/data/hooks';
import { accountRepository } from '@/data/repositories/local/localRepository';
import { useSessionStore } from '@/data/session';
import { showToast } from '@/shared/ui/toastStore';
import { AccountKind } from '@/data/db';

const ACCOUNT_KIND_OPTIONS: Array<{ value: AccountKind; label: string }> = [
  { value: 'credit_card', label: 'Cartão' },
  { value: 'checking', label: 'Conta' },
  { value: 'wallet', label: 'Carteira' },
];

export const AccountsView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserId } = useSessionStore();
  const { accounts } = useAccounts();
  const currentCompetence = getCurrentCompetence();
  const { transactions } = useTransactions();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('credit_card');
  const [closingDay, setClosingDay] = useState<number>(25);
  const [dueDay, setDueDay] = useState<number>(5);

  const activeBank = useMemo(() => {
    if (selectedBankId) return getBankById(selectedBankId);
    return matchBankByName(name);
  }, [selectedBankId, name]);

  const openAddSheet = () => {
    setSelectedBankId(null);
    setName('');
    setKind('credit_card');
    setClosingDay(25);
    setDueDay(5);
    setIsAddOpen(true);
  };

  const handleSelectBank = (bank: BankPreset | null) => {
    if (!bank) {
      const wasPresetName = BRAZILIAN_BANKS.some((b) => b.name === name.trim());
      setSelectedBankId(null);
      if (wasPresetName) setName('');
      return;
    }

    const previousPreset = selectedBankId ? getBankById(selectedBankId)?.name : undefined;
    setSelectedBankId(bank.id);
    if (!name.trim() || name.trim() === previousPreset || BRAZILIAN_BANKS.some((b) => b.name === name.trim())) {
      setName(bank.name);
    }
  };

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast({ message: 'Escolha um banco ou digite o nome da conta', type: 'error' });
      return;
    }

    await accountRepository.create({
      name: trimmedName,
      kind,
      ownerId: currentUserId || 'default',
      closingDay: kind === 'credit_card' ? closingDay : undefined,
      dueDay: kind === 'credit_card' ? dueDay : undefined,
    });

    showToast({ message: 'Conta cadastrada com sucesso!', type: 'success' });
    setIsAddOpen(false);
    setSelectedBankId(null);
    setName('');
  };

  // Calculate current invoice amount for a credit card
  const getCardCurrentInvoice = (accountId: string, cardClosingDay?: number) => {
    if (!cardClosingDay) return 0;
    return transactions
      .filter((t) => {
        if (t.accountId !== accountId || t.type !== 'expense') return false;
        const invoiceComp = calculateCardInvoiceCompetence(t.date, cardClosingDay);
        return invoiceComp === currentCompetence;
      })
      .reduce((sum, t) => sum + t.amountCents, 0);
  };

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      <MobileHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 -ml-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-xl hover:bg-[var(--surface)] active:scale-90 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[var(--text)] tracking-tight truncate">Contas e Cartões</h1>
              <p className="text-[11px] text-[var(--text-muted)] truncate">Bancos, carteiras e faturas</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={openAddSheet} className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </Button>
        </div>
      </MobileHeader>

      {/* Credit Cards Section */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Cartões de Crédito
        </h2>

        {accounts.filter((a) => a.kind === 'credit_card').length === 0 ? (
          <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)] text-center">
            Nenhum cartão cadastrado.
          </div>
        ) : (
          accounts
            .filter((a) => a.kind === 'credit_card')
            .map((card) => {
              const invoiceAmount = getCardCurrentInvoice(card.id, card.closingDay);
              const matchedBank = matchBankByName(card.name);
              return (
                <Card key={card.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BankLogo
                        bank={matchedBank}
                        size="md"
                        fallback={<CreditCard className="w-5 h-5" />}
                      />
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text)]">{card.name}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                          <span>Fecha dia {card.closingDay}</span>
                          <span>•</span>
                          <span>Vence dia {card.dueDay}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-xs text-[var(--text-muted)]">Fatura Atual ({currentCompetence})</span>
                    <span className="text-base font-bold tabular-nums text-[var(--text)]">
                      {formatCentsToBRL(invoiceAmount)}
                    </span>
                  </div>
                </Card>
              );
            })
        )}
      </div>

      {/* Checking Accounts & Wallets */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          Contas Correntes e Carteiras
        </h2>

        {accounts
          .filter((a) => a.kind !== 'credit_card')
          .map((acc) => {
            const matchedBank = matchBankByName(acc.name);
            return (
              <Card key={acc.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BankLogo
                    bank={matchedBank}
                    size="md"
                    fallback={
                      acc.kind === 'checking' ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Wallet className="w-5 h-5" />
                      )
                    }
                  />
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text)]">{acc.name}</h3>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {acc.kind === 'checking' ? 'Conta Corrente' : 'Carteira / Dinheiro'}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      {/* Add Account Sheet */}
      <Sheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Nova Conta ou Cartão"
        headerAction={
          <button
            type="button"
            onClick={handleCreate}
            className="px-3 py-1.5 rounded-full bg-[var(--primary)] text-black text-xs font-bold active:scale-95 transition-transform"
          >
            Salvar
          </button>
        }
        footer={
          <Button variant="primary" size="lg" fullWidth onClick={handleCreate}>
            Salvar Conta
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {/* Segmented Tipo selector (iOS native feel) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">Tipo</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
              {ACCOUNT_KIND_OPTIONS.map((opt) => {
                const isActive = kind === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKind(opt.value)}
                    className={`py-2 px-2 rounded-xl text-xs font-semibold transition-transform duration-100 active:scale-95 ${
                      isActive
                        ? 'bg-[var(--primary)] text-black shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pre-existing Brazilian banks with logo alongside name */}
          {kind !== 'wallet' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Instituição / Banco
                </label>
                {activeBank && (
                  <span className="text-[11px] font-semibold text-[var(--primary-bright)]">
                    {activeBank.name}
                  </span>
                )}
              </div>

              <div
                data-no-sheet-drag="true"
                className="grid grid-cols-2 gap-2 max-h-[176px] overflow-y-auto overscroll-y-contain pr-1 ios-scroll touch-pan-y rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-2"
              >
                {BRAZILIAN_BANKS.map((bank) => {
                  const isSelected = activeBank?.id === bank.id;
                  return (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => handleSelectBank(bank)}
                      className={`flex items-center gap-2.5 p-2 rounded-2xl border text-left transition-transform duration-100 active:scale-[0.97] min-h-[48px] ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--surface-2)] text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <BankLogo bank={bank} size="sm" />
                      <span className="text-xs font-semibold truncate flex-1">{bank.name}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--primary-bright)] shrink-0" />
                      )}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleSelectBank(null)}
                  className={`flex items-center gap-2.5 p-2 rounded-2xl border text-left transition-transform duration-100 active:scale-[0.97] min-h-[48px] ${
                    !activeBank
                      ? 'border-[var(--primary)]/60 bg-[var(--surface-2)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <BankLogo
                    size="sm"
                    fallback={<Building2 className="w-4 h-4 text-[var(--text-muted)]" />}
                  />
                  <span className="text-xs font-semibold truncate flex-1">Outro banco</span>
                </button>
              </div>
            </div>
          )}

          {/* Account Name Input with Live Matched Bank Logo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-muted)]">Nome da conta</label>
            <div className="flex items-center gap-2.5">
              <BankLogo
                bank={activeBank}
                size="sm"
                fallback={
                  kind === 'credit_card' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : kind === 'checking' ? (
                    <Building2 className="w-4 h-4" />
                  ) : (
                    <Wallet className="w-4 h-4" />
                  )
                }
              />
              <input
                type="text"
                placeholder={
                  kind === 'wallet'
                    ? 'Ex: Carteira, Dinheiro em casa'
                    : 'Ex: Nubank Ultravioleta, Itaú Black'
                }
                value={name}
                onChange={(e) => {
                  const val = e.target.value;
                  setName(val);
                  const matched = matchBankByName(val);
                  setSelectedBankId(matched ? matched.id : null);
                }}
                className="flex-1 min-w-0 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[44px]"
              />
            </div>
          </div>

          {kind === 'credit_card' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Dia Fechamento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={closingDay}
                  onChange={(e) => setClosingDay(Number(e.target.value))}
                  className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[44px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Dia Vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[44px]"
                />
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
};
