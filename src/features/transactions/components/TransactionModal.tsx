import React, { useState, useEffect, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Sheet } from '@/shared/ui/Sheet';
import { NumericKeypad } from '@/shared/ui/NumericKeypad';
import { Button } from '@/shared/ui/Button';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { formatCentsToBRL, keypadInputToCents } from '@/shared/lib/money';
import { getTodayDateString, formatFriendlyDate } from '@/shared/lib/dates';
import { generateInstallmentPlan } from '@/shared/lib/installments';
import { useCategories, useAccounts } from '@/data/hooks';
import { transactionRepository, settingsRepository } from '@/data/repositories/local/localRepository';
import { useTransactionModalStore } from '../transactionModalStore';
import { showToast } from '@/shared/ui/toastStore';
import { PaymentMethod, TransactionType } from '@/data/db';
import {
  Calendar,
  CreditCard,
  Trash2,
  Zap,
  Banknote,
  Receipt,
  ArrowLeftRight,
  Wallet,
  Tag,
  Check,
} from 'lucide-react';

const PAYMENT_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { value: 'pix', label: 'PIX', icon: Zap },
  { value: 'credit', label: 'Crédito', icon: CreditCard },
  { value: 'debit', label: 'Débito', icon: Wallet },
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'boleto', label: 'Boleto', icon: Receipt },
  { value: 'transfer', label: 'Transf.', icon: ArrowLeftRight },
];

const INSTALLMENT_PRESETS = [1, 2, 3, 4, 5, 6, 10, 12];
const LAST_PAYMENT_KEY = 'fecho_last_payment_method';

function getCachedPaymentMethod(): PaymentMethod {
  try {
    const val = localStorage.getItem(LAST_PAYMENT_KEY);
    if (
      val === 'pix' ||
      val === 'credit' ||
      val === 'debit' ||
      val === 'cash' ||
      val === 'boleto' ||
      val === 'transfer'
    ) {
      return val;
    }
  } catch {
    // ignore
  }
  return 'pix';
}

export const TransactionModal: React.FC = () => {
  const { isOpen, close, editingTransaction, defaultType } = useTransactionModalStore();
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amountCents, setAmountCents] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => getCachedPaymentMethod());
  const [date, setDate] = useState<string>(getTodayDateString());
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState<boolean>(false);

  const { categories } = useCategories(type);
  const { accounts } = useAccounts();

  const todayStr = getTodayDateString();
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  // Hydrate payment method preference once at app mount (never during sheet slide-up)
  useEffect(() => {
    try {
      if (localStorage.getItem(LAST_PAYMENT_KEY)) return;
    } catch {
      return;
    }
    settingsRepository.getPreferences().then((pref) => {
      if (pref.lastPaymentMethod) {
        try {
          localStorage.setItem(LAST_PAYMENT_KEY, pref.lastPaymentMethod);
        } catch {
          // ignore
        }
        setPaymentMethod(pref.lastPaymentMethod);
      }
    });
  }, []);

  // Reset or initialize state synchronously on frame 0 when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowDeleteSheet(false);
      setShowDatePicker(false);
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmountCents(editingTransaction.amountCents);
        setDescription(editingTransaction.description);
        setCategoryId(editingTransaction.categoryId);
        setAccountId(editingTransaction.accountId);
        setPaymentMethod(editingTransaction.paymentMethod);
        setDate(editingTransaction.date);
        setInstallmentsCount(editingTransaction.installment?.total || 1);
      } else {
        setType(defaultType);
        setAmountCents(0);
        setDescription('');
        setCategoryId(categories[0]?.id || '');
        if (!accountId && accounts[0]?.id) {
          setAccountId(accounts[0].id);
        }
        setDate(getTodayDateString());
        setInstallmentsCount(1);
        setPaymentMethod(getCachedPaymentMethod());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTransaction, defaultType]);

  // Ensure selected category always belongs to the active type (expense vs income)
  useEffect(() => {
    if (categories.length === 0) return;
    const stillValid = categories.some((c) => c.id === categoryId);
    if (!categoryId || !stillValid) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  const handleKeyPress = useCallback((key: string) => {
    setAmountCents((prev) => keypadInputToCents(prev, key));
  }, []);

  const handleSave = useCallback(async () => {
    if (isSubmitting) return;

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

          try {
            localStorage.setItem(LAST_PAYMENT_KEY, 'credit');
          } catch {
            // ignore
          }
          await settingsRepository.updatePreferences({ lastPaymentMethod: 'credit' });

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

          try {
            localStorage.setItem(LAST_PAYMENT_KEY, paymentMethod);
          } catch {
            // ignore
          }
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
  }, [
    isSubmitting,
    amountCents,
    categories,
    categoryId,
    description,
    type,
    accountId,
    accounts,
    editingTransaction,
    paymentMethod,
    date,
    installmentsCount,
    close,
  ]);

  // Support hardware keyboard numbers/Enter when no text input is active
  useEffect(() => {
    if (!isOpen || showDeleteSheet) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isFormControl =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT');
      if (isFormControl) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyPress('backspace');
      } else if (e.key === 'Delete') {
        e.preventDefault();
        handleKeyPress('clear');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, showDeleteSheet, handleKeyPress, handleSave]);

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

  const saveLabel = editingTransaction
    ? 'Salvar Alterações'
    : type === 'expense'
      ? 'Salvar Gasto'
      : 'Salvar Receita';

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={close}
        title={
          editingTransaction
            ? 'Editar Lançamento'
            : type === 'expense'
              ? 'Novo Gasto'
              : 'Nova Receita'
        }
        headerAction={
          editingTransaction ? (
            <button
              type="button"
              onClick={() => setShowDeleteSheet(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--danger)]/15 text-[var(--danger)] hover:bg-[var(--danger)]/25 active:scale-90 transition-transform"
              aria-label="Excluir lançamento"
              title="Excluir lançamento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : undefined
        }
        footer={
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSave}
              isLoading={isSubmitting}
              className="text-base font-bold min-h-[48px] rounded-2xl"
            >
              <Check className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {saveLabel}
              {amountCents > 0 ? ` · ${formatCentsToBRL(amountCents)}` : ''}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {/* Type Toggle + Compact Amount Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex p-1 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] shrink-0">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-transform duration-100 active:scale-95 ${
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
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-transform duration-100 active:scale-95 ${
                  type === 'income'
                    ? 'bg-[var(--primary)] text-black shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Receita
              </button>
            </div>

            <div className="text-right min-w-0">
              <div
                className={`text-[30px] leading-none font-extrabold tabular-nums tracking-tight transition-colors ${
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
          </div>

          {/* Inline Description + Quick Date Pill (No accordion hunt required) */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0 flex items-center">
              <Tag className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  type === 'expense'
                    ? 'Descrição (ex: Almoço, Uber)...'
                    : 'Descrição (ex: Salário, Freela)...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                enterKeyHint="done"
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)]/70 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:border-[var(--primary)] min-h-[42px]"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowDatePicker((prev) => !prev)}
              className={`shrink-0 flex items-center gap-1.5 px-3 min-h-[42px] rounded-xl border text-xs font-semibold transition-transform duration-100 active:scale-95 ${
                showDatePicker || date !== todayStr
                  ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary-bright)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              aria-label="Escolher data"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{date === todayStr ? 'Hoje' : date === yesterdayStr ? 'Ontem' : formatFriendlyDate(date)}</span>
            </button>
          </div>

          {/* Quick Date Selector Strip when toggled */}
          {showDatePicker && (
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => {
                  setDate(todayStr);
                  setShowDatePicker(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 active:scale-95 ${
                  date === todayStr
                    ? 'bg-[var(--primary)] text-black'
                    : 'bg-[var(--surface)] text-[var(--text-muted)]'
                }`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  setDate(yesterdayStr);
                  setShowDatePicker(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform duration-100 active:scale-95 ${
                  date === yesterdayStr
                    ? 'bg-[var(--primary)] text-black'
                    : 'bg-[var(--surface)] text-[var(--text-muted)]'
                }`}
              >
                Ontem
              </button>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 min-w-0 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[var(--primary)] min-h-[36px]"
              />
            </div>
          )}

          {/* Category Horizontal Quick Selector */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar touch-pan-x overscroll-x-contain">
            {categories.map((cat) => {
              const isSelected = cat.id === categoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center min-w-[62px] py-2 px-1.5 rounded-2xl border transition-transform duration-100 active:scale-95 shrink-0 ${
                    isSelected
                      ? 'border-[var(--primary)] bg-[var(--surface-2)] shadow-sm text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center mb-1 text-white shadow-xs"
                    style={{ backgroundColor: cat.color }}
                  >
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] truncate max-w-[56px] text-center font-medium">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* One-Tap Payment Method Chips (No clunky iOS picker wheel) */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar touch-pan-x overscroll-x-contain">
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition-transform duration-100 active:scale-95 min-h-[34px] ${
                    isSelected
                      ? 'bg-white text-black border-white'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Account Chips (when multiple accounts exist) */}
          {accounts.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar touch-pan-x overscroll-x-contain">
              <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0 mr-0.5">
                Conta:
              </span>
              {accounts.map((acc) => {
                const isSelected = acc.id === accountId;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-semibold shrink-0 transition-transform duration-100 active:scale-95 ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary-bright)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {acc.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Installment quick pills (if credit card expense) */}
          {paymentMethod === 'credit' && type === 'expense' && !editingTransaction && (
            <div className="flex flex-col gap-1.5 p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                  <CreditCard className="w-3.5 h-3.5 text-[var(--primary)]" />
                  Parcelamento
                </span>
                <span className="text-[var(--text-muted)] tabular-nums">
                  {installmentsCount === 1
                    ? 'À vista'
                    : `${installmentsCount}x de ${formatCentsToBRL(Math.round(amountCents / installmentsCount))}`}
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain">
                {INSTALLMENT_PRESETS.map((num) => {
                  const isSelected = installmentsCount === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setInstallmentsCount(num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-transform duration-100 active:scale-95 ${
                        isSelected
                          ? 'bg-[var(--primary)] text-black'
                          : 'bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border)]'
                      }`}
                    >
                      {num === 1 ? '1x' : `${num}x`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compact Numeric Keypad */}
          <NumericKeypad compact onKeyPress={handleKeyPress} />
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
