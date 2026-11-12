import React, { useState, useEffect } from 'react';
import { Sheet } from '@/shared/ui/Sheet';
import { NumericKeypad } from '@/shared/ui/NumericKeypad';
import { Button } from '@/shared/ui/Button';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { formatCentsToBRL, keypadInputToCents } from '@/shared/lib/money';
import { getTodayDateString } from '@/shared/lib/dates';
import { generateInstallmentPlan } from '@/shared/lib/installments';
import { useCategories, useAccounts } from '@/data/hooks';
import { transactionRepository, settingsRepository } from '@/data/repositories/local/localRepository';
import { useTransactionModalStore } from '../transactionModalStore';
import { showToast } from '@/shared/ui/toastStore';
import { PaymentMethod, TransactionType } from '@/data/db';
import { ChevronDown, Calendar, CreditCard, Tag, Trash2 } from 'lucide-react';

export const TransactionModal: React.FC = () => {
  const { isOpen, close, editingTransaction, defaultType } = useTransactionModalStore();
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amountCents, setAmountCents] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState<boolean>(false);

  const { categories } = useCategories(type);
  const { accounts } = useAccounts();

  // Reset or initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowDeleteSheet(false);
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmountCents(editingTransaction.amountCents);
        setDescription(editingTransaction.description);
        setCategoryId(editingTransaction.categoryId);
        setAccountId(editingTransaction.accountId);
        setPaymentMethod(editingTransaction.paymentMethod);
        setDate(editingTransaction.date);
        setInstallmentsCount(editingTransaction.installment?.total || 1);
        setShowAdvanced(true);
      } else {
        setType(defaultType);
        setAmountCents(0);
        setDescription('');
        setDate(getTodayDateString());
        setInstallmentsCount(1);
        setShowAdvanced(false);

        // Load user preferred default payment method
        settingsRepository.getPreferences().then((pref) => {
          if (pref.lastPaymentMethod) {
            setPaymentMethod(pref.lastPaymentMethod);
          }
        });
      }
    }
  }, [isOpen, editingTransaction, defaultType]);

  // Set default category and account if not set
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleKeyPress = (key: string) => {
    setAmountCents((prev) => keypadInputToCents(prev, key));
  };

  const handleSave = async () => {
    if (amountCents <= 0) {
      showToast({ message: 'Digite um valor maior que zero', type: 'error' });
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const finalDescription =
      description.trim() || selectedCategory?.name || (type === 'expense' ? 'Despesa' : 'Receita');
    const finalAccountId = accountId || (accounts[0]?.id ?? '');

    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        await transactionRepository.update(editingTransaction.id, {
          type,
          amountCents,
          description: finalDescription,
          categoryId: categoryId || editingTransaction.categoryId,
          accountId: finalAccountId,
          paymentMethod,
          date,
        });

        showToast({
          message: 'Lançamento atualizado!',
          type: 'success',
        });
      } else {
        if (type === 'expense' && paymentMethod === 'credit' && installmentsCount > 1) {
          const groupId = 'group_' + Math.random().toString(36).substring(2, 10);
          const competence = date.substring(0, 7);
          const plan = generateInstallmentPlan({
            totalAmountCents: amountCents,
            installmentsCount,
            firstDate: date,
            initialCompetence: competence,
            baseDescription: finalDescription,
          });

          await Promise.all(
            plan.map((item) =>
              transactionRepository.create({
                type: 'expense',
                amountCents: item.amountCents,
                description: item.description,
                categoryId,
                accountId: finalAccountId,
                paymentMethod: 'credit',
                date: item.date,
                status: 'confirmed',
                installment: {
                  groupId,
                  number: item.installmentNumber,
                  total: item.totalInstallments,
                },
              })
            )
          );

          showToast({
            message: `Compra parcelada em ${installmentsCount}x salva!`,
            type: 'success',
            action: {
              label: 'Desfazer',
              onClick: async () => {
                await transactionRepository.softDeleteGroup(groupId);
                showToast({ message: 'Parcelamento desfeito!', type: 'info' });
              },
            },
          });
        } else {
          const created = await transactionRepository.create({
            type,
            amountCents,
            description: finalDescription,
            categoryId,
            accountId: finalAccountId,
            paymentMethod,
            date,
            status: 'confirmed',
          });

          await settingsRepository.updatePreferences({ lastPaymentMethod: paymentMethod });

          showToast({
            message: `${type === 'expense' ? 'Gasto' : 'Receita'} de ${formatCentsToBRL(amountCents)} salvo!`,
            type: 'success',
            action: {
              label: 'Desfazer',
              onClick: async () => {
                await transactionRepository.softDelete(created.id);
                showToast({ message: 'Lançamento desfeito!', type: 'info' });
              },
            },
          });
        }
      }

      close();
    } catch (err) {
      console.error(err);
      showToast({ message: 'Erro ao salvar lançamento', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!editingTransaction) return;
    const deletedId = editingTransaction.id;
    await transactionRepository.softDelete(deletedId);
    setShowDeleteSheet(false);
    close();
    showToast({
      message: 'Lançamento excluído',
      type: 'info',
      action: {
        label: 'Desfazer',
        onClick: async () => {
          await transactionRepository.restore(deletedId);
          showToast({ message: 'Lançamento restaurado', type: 'success' });
        },
      },
    });
  };

  const handleDeleteFutureInstallments = async () => {
    if (!editingTransaction?.installment) return;
    await transactionRepository.softDeleteGroup(
      editingTransaction.installment.groupId,
      editingTransaction.installment.number
    );
    setShowDeleteSheet(false);
    close();
    showToast({
      message: 'Parcelas excluídas!',
      type: 'info',
    });
  };

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={close}
        title={editingTransaction ? 'Editar Lançamento' : type === 'expense' ? 'Novo Gasto' : 'Nova Receita'}
      >
        <div className="flex flex-col gap-4 pb-2">
          {/* Type Toggle (Expense / Income) */}
          <div className="flex p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                type === 'expense'
                  ? 'bg-[var(--danger)] text-white shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all active:scale-95 ${
                type === 'income'
                  ? 'bg-[var(--primary)] text-black shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Receita
            </button>
          </div>

          {/* Big Monetary Display */}
          <div className="flex flex-col items-center justify-center py-2">
            <span className="text-xs uppercase font-medium tracking-wider text-[var(--text-muted)] mb-1">
              Valor
            </span>
            <div
              className={`text-4xl font-extrabold tabular-nums tracking-tight transition-colors ${
                amountCents === 0
                  ? 'text-[var(--text-muted)]'
                  : type === 'expense'
                    ? 'text-[var(--text)]'
                    : 'text-[var(--primary-bright)]'
              }`}
            >
              {formatCentsToBRL(amountCents)}
            </div>
          </div>

          {/* Category Horizontal Quick Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-muted)]">Categoria</span>
              <span className="text-xs text-[var(--text-muted)]">
                {categories.find((c) => c.id === categoryId)?.name || 'Selecione'}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-x overscroll-x-contain">
              {categories.map((cat) => {
                const isSelected = cat.id === categoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center justify-center min-w-[68px] p-2.5 rounded-2xl border transition-all active:scale-95 ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--surface-2)] shadow-sm'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center mb-1 text-white shadow-xs"
                      style={{ backgroundColor: cat.color }}
                    >
                      <CategoryIcon name={cat.icon} className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] truncate max-w-[62px] text-center font-medium">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Payment & Account Selectors */}
          <div className="grid grid-cols-2 gap-2">
            {/* Payment Method */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[var(--text-muted)]">Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[46px]"
              >
                <option value="pix">PIX</option>
                <option value="credit">Cartão de Crédito</option>
                <option value="debit">Cartão de Débito</option>
                <option value="cash">Dinheiro</option>
                <option value="boleto">Boleto</option>
                <option value="transfer">Transferência</option>
              </select>
            </div>

            {/* Account */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-[var(--text-muted)]">Conta / Cartão</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[46px]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Installment count (if credit card) */}
          {paymentMethod === 'credit' && type === 'expense' && !editingTransaction && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--text)]">
                <CreditCard className="w-4 h-4 text-[var(--primary)]" />
                <span>Parcelamento</span>
              </div>
              <select
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl px-2.5 py-2 focus:outline-none"
              >
                <option value={1}>À vista (1x)</option>
                {[2, 3, 4, 5, 6, 8, 10, 12, 18, 24].map((num) => (
                  <option key={num} value={num}>
                    {num}x de {formatCentsToBRL(Math.round(amountCents / num))}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Advanced fields (Description, Date) */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between text-xs text-[var(--text-muted)] hover:text-[var(--text)] pt-1 min-h-[36px]"
          >
            <span>Mais detalhes (descrição, data)</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            />
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-3 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Almoço com amigos"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[46px]"
                />
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-[var(--text-muted)] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Data da Compra
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[var(--primary)] min-h-[46px]"
                />
              </div>
            </div>
          )}

          {/* Numeric Keypad */}
          <NumericKeypad onKeyPress={handleKeyPress} className="mt-1" />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSave}
              isLoading={isSubmitting}
              className="text-base font-bold"
            >
              {editingTransaction ? 'Salvar Alterações' : 'Salvar Gasto'}
            </Button>

            {editingTransaction && (
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onClick={() => setShowDeleteSheet(true)}
                className="text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Lançamento
              </Button>
            )}
          </div>
        </div>
      </Sheet>

      {/* Native iOS-style Delete Confirmation Sheet */}
      <Sheet
        isOpen={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        title={
          editingTransaction?.installment
            ? `Parcela ${editingTransaction.installment.number}/${editingTransaction.installment.total}`
            : 'Excluir lançamento?'
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            {editingTransaction?.installment
              ? 'Este gasto faz parte de uma compra parcelada. O que deseja excluir?'
              : 'Tem certeza que deseja excluir este lançamento?'}
          </p>

          {editingTransaction?.installment ? (
            <>
              <Button variant="danger" size="lg" fullWidth onClick={handleDeleteFutureInstallments}>
                Excluir esta e próximas parcelas
              </Button>
              <Button variant="secondary" size="lg" fullWidth onClick={handleDeleteSingle}>
                Excluir apenas esta parcela
              </Button>
            </>
          ) : (
            <Button variant="danger" size="lg" fullWidth onClick={handleDeleteSingle}>
              Excluir Lançamento
            </Button>
          )}

          <Button variant="ghost" size="md" fullWidth onClick={() => setShowDeleteSheet(false)}>
            Cancelar
          </Button>
        </div>
      </Sheet>
    </>
  );
};
