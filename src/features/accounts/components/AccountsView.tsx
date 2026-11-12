import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, Building2, Plus, ArrowLeft } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { MobileHeader } from '@/shared/ui/MobileHeader';
import { formatCentsToBRL } from '@/shared/lib/money';
import { getCurrentCompetence } from '@/shared/lib/dates';
import { calculateCardInvoiceCompetence } from '@/shared/lib/competence';
import { useAccounts, useTransactions } from '@/data/hooks';
import { accountRepository } from '@/data/repositories/local/localRepository';
import { useSessionStore } from '@/data/session';
import { showToast } from '@/shared/ui/toastStore';
import { AccountKind } from '@/data/db';

export const AccountsView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUserId } = useSessionStore();
  const { accounts } = useAccounts();
  const currentCompetence = getCurrentCompetence();
  const { transactions } = useTransactions();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('credit_card');
  const [closingDay, setClosingDay] = useState<number>(25);
  const [dueDay, setDueDay] = useState<number>(5);

  const handleCreate = async () => {
    if (!name.trim()) {
      showToast({ message: 'Digite o nome da conta ou cartão', type: 'error' });
      return;
    }

    await accountRepository.create({
      name: name.trim(),
      kind,
      ownerId: currentUserId || 'default',
      closingDay: kind === 'credit_card' ? closingDay : undefined,
      dueDay: kind === 'credit_card' ? dueDay : undefined,
    });

    showToast({ message: 'Conta cadastrada com sucesso!', type: 'success' });
    setIsAddOpen(false);
    setName('');
  };

  // Calculate current invoice amount for a credit card
  const getCardCurrentInvoice = (accountId: string, cardClosingDay?: number) => {
    if (!cardClosingDay) return 0;
    return transactions
      .filter((t) => {
        if (t.accountId !== accountId || t.type !== 'expense') return false;
        // Determine which invoice this transaction falls into
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
          <Button size="sm" variant="secondary" onClick={() => setIsAddOpen(true)} className="shrink-0">
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
              return (
                <Card key={card.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--primary)]">
                        <CreditCard className="w-5 h-5" />
                      </div>
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
          .map((acc) => (
            <Card key={acc.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--primary)]">
                  {acc.kind === 'checking' ? <Building2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text)]">{acc.name}</h3>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {acc.kind === 'checking' ? 'Conta Corrente' : 'Carteira / Dinheiro'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
      </div>

      {/* Add Account Sheet */}
      <Sheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Nova Conta ou Cartão"
        footer={
          <Button variant="primary" size="lg" fullWidth onClick={handleCreate}>
            Salvar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Tipo</label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AccountKind)}
              className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-3 py-2.5 focus:outline-none min-h-[44px]"
            >
              <option value="credit_card">Cartão de Crédito</option>
              <option value="checking">Conta Corrente</option>
              <option value="wallet">Carteira / Dinheiro</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-muted)]">Nome</label>
            <input
              type="text"
              placeholder="Ex: Nubank, Itaú, Carteira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-3 py-2.5 focus:outline-none min-h-[44px]"
            />
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
                  className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-3 py-2.5 focus:outline-none min-h-[44px]"
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
                  className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-3 py-2.5 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  );
};
