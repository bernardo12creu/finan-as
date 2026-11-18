import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { format, subDays } from 'date-fns';
import { Sheet } from '@/shared/ui/Sheet';
import { NumericKeypad } from '@/shared/ui/NumericKeypad';
import { Button } from '@/shared/ui/Button';
import { CategoryIcon } from '@/shared/ui/CategoryIcon';
import { BankLogo } from '@/shared/ui/BankLogo';
import { SubscriptionLogo } from '@/shared/ui/SubscriptionLogo';
import { matchBankByName } from '@/shared/lib/banks';
import {
  POPULAR_SUBSCRIPTIONS,
  SubscriptionPreset,
  matchSubscriptionByName,
} from '@/shared/lib/subscriptions';
import { formatCentsToBRL, keypadInputToCents } from '@/shared/lib/money';
import { getTodayDateString, formatFriendlyDate } from '@/shared/lib/dates';
import {
  generateInstallmentPlan,
  stripInstallmentSuffix,
  formatInstallmentDescription,
} from '@/shared/lib/installments';
import { parseVoiceTransactions } from '@/shared/lib/voiceParser';
import { useCategories, useAccounts } from '@/data/hooks';
import {
  transactionRepository,
  recurringRepository,
  settingsRepository,
} from '@/data/repositories/local/localRepository';
import { useSessionStore } from '@/data/session';
import { useTransactionModalStore } from '../transactionModalStore';
import { showToast } from '@/shared/ui/toastStore';
import { CreateTransactionDTO } from '@/data/repositories/interfaces';
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
  Layers,
  Mic,
  MicOff,
  Sparkles,
  X,
  Repeat,
} from 'lucide-react';

function normalizeCategoryName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isSubscriptionCat(cat: { id: string; name: string } | undefined): boolean {
  if (!cat) return false;
  return (
    cat.id.endsWith('cat_assinaturas') ||
    normalizeCategoryName(cat.name).includes('assinatura')
  );
}

function isEducationCat(cat: { id: string; name: string } | undefined): boolean {
  if (!cat) return false;
  return (
    cat.id.endsWith('cat_educacao') ||
    normalizeCategoryName(cat.name).includes('educac')
  );
}

function canCategoryBeRecurring(
  txType: TransactionType,
  cat: { id: string; name: string } | undefined
): boolean {
  return txType === 'expense' && (isSubscriptionCat(cat) || isEducationCat(cat));
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

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

const INSTALLMENT_PRESETS = Array.from({ length: 24 }, (_, i) => i + 1);
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
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState<boolean>(false);
  const [applyToSeries, setApplyToSeries] = useState<boolean>(true);
  const [seriesSiblingsCount, setSeriesSiblingsCount] = useState<number>(1);
  const [isVoiceMode, setIsVoiceMode] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceInterim, setVoiceInterim] = useState<string>('');
  const [excludedVoiceIds, setExcludedVoiceIds] = useState<string[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const baseTranscriptRef = useRef<string>('');
  const latestTranscriptRef = useRef<string>('');

  const { categories } = useCategories(type);
  const { categories: allCategories } = useCategories();
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

  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch {
        // ignore stop errors when already inactive
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRec = getSpeechRecognitionConstructor();
    if (!SpeechRec) {
      showToast({
        message: 'Microfone indisponível neste navegador. Digite sua frase abaixo!',
        type: 'info',
      });
      setIsListening(false);
      return;
    }

    stopListening();

    try {
      const rec = new SpeechRec();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;
      baseTranscriptRef.current = latestTranscriptRef.current.trim();

      rec.onresult = (event) => {
        let sessionFinal = '';
        let sessionInterim = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const chunk = result[0]?.transcript || '';
          if (result.isFinal) {
            sessionFinal += `${chunk} `;
          } else {
            sessionInterim += `${chunk} `;
          }
        }
        const mergedFinal = [baseTranscriptRef.current, sessionFinal.trim()]
          .filter(Boolean)
          .join(' ')
          .trim();
        latestTranscriptRef.current = mergedFinal;
        setVoiceTranscript(mergedFinal);
        setVoiceInterim(sessionInterim.trim());
      };

      rec.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showToast({
            message: 'Permissão do microfone negada. Você também pode digitar abaixo.',
            type: 'error',
          });
        }
        setIsListening(false);
      };

      rec.onend = () => {
        baseTranscriptRef.current = latestTranscriptRef.current.trim();
        setVoiceInterim('');
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      showToast({
        message: 'Não foi possível iniciar o microfone.',
        type: 'error',
      });
    }
  }, [stopListening]);

  const openVoiceMode = useCallback(() => {
    setIsVoiceMode(true);
    startListening();
  }, [startListening]);

  const closeVoiceMode = useCallback(() => {
    stopListening();
    setIsVoiceMode(false);
  }, [stopListening]);

  // Reset or initialize state synchronously before browser paint when modal opens
  useLayoutEffect(() => {
    if (isOpen) {
      setShowDeleteSheet(false);
      setShowDatePicker(false);
      setApplyToSeries(true);
      setIsVoiceMode(false);
      setVoiceTranscript('');
      setVoiceInterim('');
      setExcludedVoiceIds([]);
      baseTranscriptRef.current = '';
      latestTranscriptRef.current = '';
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmountCents(editingTransaction.amountCents);
        setDescription(stripInstallmentSuffix(editingTransaction.description));
        setCategoryId(editingTransaction.categoryId);
        setAccountId(editingTransaction.accountId);
        setPaymentMethod(editingTransaction.paymentMethod);
        setDate(editingTransaction.date);
        setInstallmentsCount(editingTransaction.installment?.total || 1);
        setIsRecurring(Boolean(editingTransaction.recurringRuleId));
        setSeriesSiblingsCount(editingTransaction.installment?.total || 1);
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
        setIsRecurring(false);
        setSeriesSiblingsCount(1);
        setPaymentMethod(getCachedPaymentMethod());
      }
    } else {
      stopListening();
      setIsVoiceMode(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingTransaction, defaultType]);

  // Stop speech recognition cleanly if component unmounts
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  // Discover all siblings in the installment/recurring/repeated series (including completed ones)
  useEffect(() => {
    if (!isOpen || !editingTransaction) {
      setSeriesSiblingsCount(1);
      return;
    }
    let cancelled = false;
    transactionRepository.findSeriesSiblings(editingTransaction.id).then((list) => {
      if (!cancelled) {
        setSeriesSiblingsCount(list.length);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, editingTransaction]);

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

  const isInstallmentEdit = Boolean(
    editingTransaction?.installment && editingTransaction.installment.total > 1
  );
  const isRecurringEdit = Boolean(editingTransaction?.recurringRuleId);
  const hasSeries = Boolean(
    editingTransaction && (isInstallmentEdit || isRecurringEdit || seriesSiblingsCount > 1)
  );
  const effectiveSeriesCount = Math.max(
    seriesSiblingsCount,
    editingTransaction?.installment?.total || 1
  );

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isSubscriptionCategory = type === 'expense' && isSubscriptionCat(selectedCategory);
  const canBeRecurringCategory = canCategoryBeRecurring(type, selectedCategory);
  const matchedSubscription = isSubscriptionCategory
    ? matchSubscriptionByName(description)
    : undefined;

  useEffect(() => {
    if (!editingTransaction && !canBeRecurringCategory && isRecurring) {
      setIsRecurring(false);
    }
  }, [editingTransaction, canBeRecurringCategory, isRecurring]);

  const handleSelectSubscription = (sub: SubscriptionPreset) => {
    setDescription(sub.name);
  };

  const fullVoiceText = [voiceTranscript, voiceInterim].filter(Boolean).join(' ').trim();
  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionConstructor()), []);

  const allCategoryMap = useMemo(
    () => new Map(allCategories.map((c) => [c.id, c])),
    [allCategories]
  );

  const parsedVoiceItems = useMemo(() => {
    if (!isVoiceMode || editingTransaction || !fullVoiceText) return [];
    const defaultAccId = accountId || accounts[0]?.id || '';
    const parsed = parseVoiceTransactions(fullVoiceText, {
      categories: allCategories.length > 0 ? allCategories : categories,
      accounts,
      defaultDate: date,
      defaultType: type,
      defaultPaymentMethod: paymentMethod,
      defaultAccountId: defaultAccId,
    });
    return parsed.filter((item) => !excludedVoiceIds.includes(item.id));
  }, [
    isVoiceMode,
    editingTransaction,
    fullVoiceText,
    allCategories,
    categories,
    accounts,
    accountId,
    date,
    type,
    paymentMethod,
    excludedVoiceIds,
  ]);

  const voiceTotalCents = useMemo(
    () => parsedVoiceItems.reduce((sum, item) => sum + item.amountCents, 0),
    [parsedVoiceItems]
  );

  const handleConfirmVoiceItems = useCallback(async () => {
    if (isSubmitting) return;
    if (parsedVoiceItems.length === 0) {
      showToast({
        message: 'Fale ou digite um lançamento com valor (ex: "35 reais de Uber no Pix")',
        type: 'error',
      });
      return;
    }

    stopListening();
    setIsSubmitting(true);
    try {
      const dtosToCreate: CreateTransactionDTO[] = [];
      const createdRuleIds: string[] = [];
      const currentUserId = useSessionStore.getState().currentUserId || 'default';

      for (const item of parsedVoiceItems) {
        if (item.type === 'expense' && item.paymentMethod === 'credit' && item.installmentsCount > 1) {
          const groupId = 'group_' + Math.random().toString(36).substring(2, 10);
          const competence = item.date.substring(0, 7);
          const plan = generateInstallmentPlan({
            totalAmountCents: item.amountCents,
            installmentsCount: item.installmentsCount,
            firstDate: item.date,
            initialCompetence: competence,
            baseDescription: item.description,
          });

          for (const part of plan) {
            dtosToCreate.push({
              type: 'expense',
              amountCents: part.amountCents,
              description: part.description,
              categoryId: item.categoryId,
              accountId: item.accountId,
              paymentMethod: 'credit',
              date: part.date,
              status: 'confirmed',
              installment: {
                groupId,
                number: part.installmentNumber,
                total: part.totalInstallments,
              },
            });
          }
        } else if (item.isRecurring) {
          const dayOfMonth = Number(item.date.split('-')[2]) || 1;
          const startCompetence = item.date.substring(0, 7);
          const rule = await recurringRepository.create({
            templateTransaction: {
              description: item.description,
              amountCents: item.amountCents,
              type: item.type,
              categoryId: item.categoryId,
              accountId: item.accountId,
              paymentMethod: item.paymentMethod,
              tags: ['recorrente'],
              visibility: 'shared',
              paidBy: currentUserId,
            },
            dayOfMonth,
            startCompetence,
            active: true,
          });
          createdRuleIds.push(rule.id);

          dtosToCreate.push({
            type: item.type,
            amountCents: item.amountCents,
            description: item.description,
            categoryId: item.categoryId,
            accountId: item.accountId,
            paymentMethod: item.paymentMethod,
            date: item.date,
            status: 'confirmed',
            recurringRuleId: rule.id,
            tags: ['recorrente'],
          });
        } else {
          dtosToCreate.push({
            type: item.type,
            amountCents: item.amountCents,
            description: item.description,
            categoryId: item.categoryId,
            accountId: item.accountId,
            paymentMethod: item.paymentMethod,
            date: item.date,
            status: 'confirmed',
          });
        }
      }

      const created = await transactionRepository.createMany(dtosToCreate);
      const countCreated = parsedVoiceItems.length;

      showToast({
        message:
          countCreated === 1
            ? '1 lançamento criado por voz!'
            : `${countCreated} lançamentos criados por voz!`,
        type: 'success',
        action: {
          label: 'Desfazer',
          onClick: async () => {
            await Promise.all([
              ...created.map((rec) => transactionRepository.softDelete(rec.id)),
              ...createdRuleIds.map((rId) => transactionRepository.softDeleteByRecurringRule(rId)),
            ]);
            showToast({ message: 'Lançamentos desfeitos!', type: 'info' });
          },
        },
      });

      close();
    } catch (err) {
      console.error(err);
      showToast({ message: 'Erro ao salvar lançamentos por voz', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, parsedVoiceItems, stopListening, close]);

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
        if (hasSeries && applyToSeries) {
          const cleanFinalDesc = stripInstallmentSuffix(finalDescription);
          const updatedCount = await transactionRepository.updateSeries(editingTransaction.id, {
            type,
            categoryId: categoryId || editingTransaction.categoryId,
            accountId: finalAccountId,
            paymentMethod,
            baseDescription: cleanFinalDesc,
            amountCents: amountCents !== editingTransaction.amountCents ? amountCents : undefined,
            anchorDate: date !== editingTransaction.date ? date : undefined,
          });

          showToast({
            message: isInstallmentEdit
              ? `Todas as ${updatedCount} parcelas foram atualizadas!`
              : `Todos os ${updatedCount} lançamentos foram atualizados!`,
            type: 'success',
          });
        } else {
          const singleDescription =
            editingTransaction.installment && editingTransaction.installment.total > 1
              ? formatInstallmentDescription(
                  finalDescription,
                  editingTransaction.installment.number,
                  editingTransaction.installment.total
                )
              : stripInstallmentSuffix(finalDescription);

          await transactionRepository.update(editingTransaction.id, {
            type,
            amountCents,
            description: singleDescription,
            categoryId: categoryId || editingTransaction.categoryId,
            accountId: finalAccountId,
            paymentMethod,
            date,
          });

          showToast({
            message: 'Lançamento atualizado!',
            type: 'success',
          });
        }
      } else {
        const effectiveIsRecurring = isRecurring && canBeRecurringCategory;
        if (effectiveIsRecurring) {
          const dayOfMonth = Number(date.split('-')[2]) || 1;
          const startCompetence = date.substring(0, 7);
          const currentUserId = useSessionStore.getState().currentUserId || 'default';

          const rule = await recurringRepository.create({
            templateTransaction: {
              description: finalDescription,
              amountCents,
              type,
              categoryId,
              accountId: finalAccountId,
              paymentMethod,
              tags: ['recorrente'],
              visibility: 'shared',
              paidBy: currentUserId,
            },
            dayOfMonth,
            startCompetence,
            active: true,
          });

          await transactionRepository.create({
            type,
            amountCents,
            description: finalDescription,
            categoryId,
            accountId: finalAccountId,
            paymentMethod,
            date,
            status: 'confirmed',
            recurringRuleId: rule.id,
            tags: ['recorrente'],
          });

          try {
            localStorage.setItem(LAST_PAYMENT_KEY, paymentMethod);
          } catch {
            // ignore
          }
          await settingsRepository.updatePreferences({ lastPaymentMethod: paymentMethod });

          showToast({
            message: `Conta recorrente "${finalDescription}" (${formatCentsToBRL(amountCents)}/mês) salva!`,
            type: 'success',
            action: {
              label: 'Desfazer',
              onClick: async () => {
                await transactionRepository.softDeleteByRecurringRule(rule.id);
                showToast({ message: 'Conta recorrente desfeita!', type: 'info' });
              },
            },
          });
        } else if (type === 'expense' && paymentMethod === 'credit' && installmentsCount > 1) {
          const groupId = 'group_' + Math.random().toString(36).substring(2, 10);
          const competence = date.substring(0, 7);
          const plan = generateInstallmentPlan({
            totalAmountCents: amountCents,
            installmentsCount,
            firstDate: date,
            initialCompetence: competence,
            baseDescription: finalDescription,
          });

          await transactionRepository.createMany(
            plan.map((item) => ({
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
            }))
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
    hasSeries,
    applyToSeries,
    isInstallmentEdit,
    paymentMethod,
    date,
    installmentsCount,
    isRecurring,
    close,
  ]);

  // Support hardware keyboard numbers/Enter when no text input is active
  useEffect(() => {
    if (!isOpen || showDeleteSheet || isVoiceMode) return;
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
  }, [isOpen, showDeleteSheet, isVoiceMode, handleKeyPress, handleSave]);

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

  const handleDeleteAllInstallments = async () => {
    if (!editingTransaction?.installment) return;
    await transactionRepository.softDeleteGroup(editingTransaction.installment.groupId);
    setShowDeleteSheet(false);
    close();
    showToast({
      message: 'Todas as parcelas excluídas!',
      type: 'info',
    });
  };

  const handleDeleteRecurring = async () => {
    if (!editingTransaction?.recurringRuleId) return;
    await transactionRepository.softDeleteByRecurringRule(editingTransaction.recurringRuleId);
    setShowDeleteSheet(false);
    close();
    showToast({
      message: 'Conta recorrente encerrada e lançamentos excluídos!',
      type: 'info',
    });
  };

  const saveLabel = editingTransaction
    ? hasSeries && applyToSeries
      ? isInstallmentEdit
        ? `Salvar nas ${effectiveSeriesCount} Parcelas`
        : `Salvar em Todos (${effectiveSeriesCount})`
      : 'Salvar Alterações'
    : isVoiceMode
      ? parsedVoiceItems.length === 0
        ? 'Confirmar por Voz'
        : parsedVoiceItems.length === 1
          ? 'Confirmar 1 Lançamento'
          : `Confirmar ${parsedVoiceItems.length} Lançamentos`
      : type === 'expense'
        ? 'Salvar Gasto'
        : 'Salvar Receita';

  return (
    <>
      <Sheet
        isOpen={isOpen}
        onClose={close}
        keepMounted
        title={
          editingTransaction
            ? 'Editar Lançamento'
            : isVoiceMode
              ? 'Lançamento por Voz'
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
          ) : (
            <button
              type="button"
              onClick={() => {
                if (isVoiceMode) closeVoiceMode();
                else openVoiceMode();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-transform border ${
                isVoiceMode
                  ? 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]'
                  : 'bg-[var(--primary)]/15 text-[var(--primary-bright)] border-[var(--primary)]/35'
              }`}
              aria-label={isVoiceMode ? 'Voltar ao teclado' : 'Lançar por voz'}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isVoiceMode ? 'Teclado' : 'Falar'}</span>
            </button>
          )
        }
        footer={
          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={isVoiceMode && !editingTransaction ? handleConfirmVoiceItems : handleSave}
              isLoading={isSubmitting}
              className="text-base font-bold min-h-[48px] rounded-2xl"
            >
              <Check className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              {saveLabel}
              {isVoiceMode && !editingTransaction
                ? voiceTotalCents > 0
                  ? ` · ${formatCentsToBRL(voiceTotalCents)}`
                  : ''
                : amountCents > 0
                  ? ` · ${formatCentsToBRL(amountCents)}`
                  : ''}
            </Button>
          </div>
        }
      >
        {isVoiceMode && !editingTransaction ? (
          <div data-no-sheet-drag="true" className="flex flex-col gap-3">
            {/* Live Voice Recording & Editable Transcript Card */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) stopListening();
                    else startListening();
                  }}
                  className={`flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border font-semibold text-xs transition-all active:scale-[0.98] ${
                    isListening
                      ? 'bg-[var(--danger)]/15 border-[var(--danger)]/40 text-[var(--danger)]'
                      : 'bg-[var(--primary)]/15 border-[var(--primary)]/35 text-[var(--primary-bright)]'
                  }`}
                >
                  {isListening ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)] animate-pulse shrink-0" />
                      <MicOff className="w-4 h-4 shrink-0" />
                      <span>Ouvindo... toque para pausar</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 shrink-0" />
                      <span>{speechSupported ? 'Toque para falar agora' : 'Microfone não suportado — digite abaixo'}</span>
                    </>
                  )}
                </button>

                {fullVoiceText && (
                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      baseTranscriptRef.current = '';
                      latestTranscriptRef.current = '';
                      setVoiceTranscript('');
                      setVoiceInterim('');
                      setExcludedVoiceIds([]);
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] active:scale-95"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <textarea
                rows={3}
                value={fullVoiceText}
                onChange={(e) => {
                  const val = e.target.value;
                  baseTranscriptRef.current = val;
                  latestTranscriptRef.current = val;
                  setVoiceTranscript(val);
                  setVoiceInterim('');
                  setExcludedVoiceIds([]);
                }}
                placeholder='Fale naturalmente: "Gastei 35 de Uber no Pix e 55 e 90 da Netflix no cartão"'
                className="w-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)]/60 rounded-xl px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-[var(--primary)] resize-none"
              />

              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--primary-bright)] shrink-0" />
                <span>Pode falar vários gastos ou receitas de uma vez; eles aparecem abaixo ao vivo.</span>
              </p>
            </div>

            {/* Live Parsed Transactions Preview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Lançamentos identificados ({parsedVoiceItems.length})
                </span>
                {parsedVoiceItems.length > 0 && (
                  <span className="text-xs font-bold tabular-nums text-[var(--primary-bright)]">
                    Total {formatCentsToBRL(voiceTotalCents)}
                  </span>
                )}
              </div>

              {parsedVoiceItems.length === 0 ? (
                <div className="p-5 rounded-2xl bg-[var(--surface-2)]/60 border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
                  Fale o que gastou ou recebeu com o valor (ex.: &ldquo;Uber 28 reais no Pix&rdquo;) para montar aqui automaticamente.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {parsedVoiceItems.map((item) => {
                    const cat = allCategoryMap.get(item.categoryId);
                    const isExpense = item.type === 'expense';
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.matchedSubscription ? (
                            <SubscriptionLogo subscription={item.matchedSubscription} size="md" />
                          ) : (
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: cat?.color || '#3f3f46' }}
                            >
                              <CategoryIcon name={cat?.icon || 'Tag'} className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-[var(--text)] truncate">
                                {item.description}
                              </span>
                              {item.installmentsCount > 1 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary-bright)] text-[10px] font-bold shrink-0 tabular-nums">
                                  {item.installmentsCount}x de {formatCentsToBRL(Math.round(item.amountCents / item.installmentsCount))}
                                </span>
                              )}
                              {item.installmentsCount <= 1 && item.isRecurring && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--primary)]/15 text-[var(--primary-bright)] text-[10px] font-bold shrink-0">
                                  <Repeat className="w-2.5 h-2.5" />
                                  Todo mês
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)] truncate">
                              {item.categoryName} · {item.paymentMethod.toUpperCase()} · {item.accountName}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-sm font-bold tabular-nums ${
                              isExpense ? 'text-[var(--text)]' : 'text-[var(--primary-bright)]'
                            }`}
                          >
                            {isExpense ? '-' : '+'}
                            {formatCentsToBRL(item.amountCents)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExcludedVoiceIds((prev) => [...prev, item.id])}
                            className="w-7 h-7 rounded-lg bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--danger)] flex items-center justify-center active:scale-90"
                            aria-label={`Remover ${item.description}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
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
              {matchedSubscription ? (
                <SubscriptionLogo
                  subscription={matchedSubscription}
                  size="xs"
                  className="absolute left-3 pointer-events-none"
                />
              ) : (
                <Tag className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 pointer-events-none" />
              )}
              <input
                type="text"
                placeholder={
                  isSubscriptionCategory
                    ? 'Assinatura (ex: Netflix, Spotify)...'
                    : type === 'expense'
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
                className={`w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)]/70 rounded-xl pl-8 py-2 focus:outline-none focus:border-[var(--primary)] min-h-[42px] ${
                  !editingTransaction ? 'pr-9' : 'pr-3'
                }`}
              />
              {!editingTransaction && (
                <button
                  type="button"
                  onClick={openVoiceMode}
                  className="absolute right-1.5 w-7 h-7 rounded-lg bg-[var(--primary)]/12 text-[var(--primary-bright)] hover:bg-[var(--primary)]/20 flex items-center justify-center active:scale-90 transition-transform"
                  aria-label="Falar lançamento por voz"
                  title="Falar lançamento por voz"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              )}
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

          {/* Series Scope Selector Card (edit all installments/recurring including completed ones) */}
          {hasSeries && (
            <div
              data-no-sheet-drag="true"
              className="flex flex-col gap-2 p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]"
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-[var(--primary-bright)]">
                  <Layers className="w-3.5 h-3.5 shrink-0" />
                  {editingTransaction?.installment
                    ? `Parcela ${editingTransaction.installment.number}/${editingTransaction.installment.total} · Compra parcelada`
                    : isRecurringEdit
                      ? `Lançamento recorrente (${effectiveSeriesCount}x)`
                      : `Lançamento repetido (${effectiveSeriesCount} registros)`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setApplyToSeries(true)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] transition-transform duration-100 active:scale-95 truncate ${
                    applyToSeries
                      ? 'bg-[var(--primary)] text-black font-bold shadow-xs'
                      : 'text-[var(--text-muted)] font-semibold hover:text-[var(--text)]'
                  }`}
                >
                  {isInstallmentEdit
                    ? `Todas as ${effectiveSeriesCount} parcelas`
                    : `Todos os ${effectiveSeriesCount} registros`}
                </button>
                <button
                  type="button"
                  onClick={() => setApplyToSeries(false)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] transition-transform duration-100 active:scale-95 truncate ${
                    !applyToSeries
                      ? 'bg-white text-black font-bold shadow-xs'
                      : 'text-[var(--text-muted)] font-semibold hover:text-[var(--text)]'
                  }`}
                >
                  {editingTransaction?.installment
                    ? `Apenas esta (${editingTransaction.installment.number}/${editingTransaction.installment.total})`
                    : 'Apenas esta (1)'}
                </button>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-snug px-0.5">
                {applyToSeries
                  ? 'Altera categoria, cartão/conta, descrição e valor em todas as parcelas, inclusive as concluídas.'
                  : 'Altera somente este lançamento específico.'}
              </p>
            </div>
          )}

          {/* Category Horizontal Quick Selector */}
          <div
            data-horizontal-scroll="true"
            className="flex gap-2 overflow-x-auto pb-0.5 no-scrollbar touch-pan-xy"
          >
            {categories.map((cat) => {
              const isSelected = cat.id === categoryId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategoryId(cat.id);
                    if (!editingTransaction) {
                      if (canCategoryBeRecurring(type, cat)) {
                        setIsRecurring(true);
                        setInstallmentsCount(1);
                      } else {
                        setIsRecurring(false);
                      }
                    }
                  }}
                  className={`touch-pan-xy flex flex-col items-center justify-center min-w-[62px] py-2 px-1.5 rounded-2xl border transition-transform duration-100 active:scale-95 shrink-0 ${
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

          {/* Popular Subscriptions with Brand Logos (only when "Assinaturas" is selected) */}
          {isSubscriptionCategory && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  Escolha a assinatura
                </span>
                {matchedSubscription && (
                  <span className="text-[11px] font-semibold text-[var(--primary-bright)]">
                    {matchedSubscription.name}
                  </span>
                )}
              </div>

              <div
                data-no-sheet-drag="true"
                className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto overscroll-y-contain pr-1 ios-scroll touch-pan-y rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-2"
              >
                {POPULAR_SUBSCRIPTIONS.map((sub) => {
                  const isSelected = matchedSubscription?.id === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSelectSubscription(sub)}
                      className={`flex items-center justify-between gap-2 p-1.5 rounded-xl border text-left transition-transform duration-100 active:scale-95 min-w-0 ${
                        isSelected
                          ? 'border-[var(--primary)] bg-[var(--primary)]/12 text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SubscriptionLogo subscription={sub} size="sm" />
                        <span className="text-xs font-semibold truncate">{sub.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[var(--primary-bright)] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* One-Tap Payment Method Chips (No clunky iOS picker wheel) */}
          <div
            data-horizontal-scroll="true"
            className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar touch-pan-xy"
          >
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = paymentMethod === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value)}
                  className={`touch-pan-xy inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition-transform duration-100 active:scale-95 min-h-[34px] ${
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
            <div
              data-horizontal-scroll="true"
              className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar touch-pan-xy"
            >
              <span className="text-[11px] text-[var(--text-muted)] font-medium shrink-0 mr-0.5">
                Conta:
              </span>
              {accounts.map((acc) => {
                const isSelected = acc.id === accountId;
                const matchedBank = matchBankByName(acc.name);
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`touch-pan-xy inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-semibold shrink-0 transition-transform duration-100 active:scale-95 ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-[var(--primary-bright)]'
                        : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]'
                    }`}
                  >
                    {matchedBank && <BankLogo bank={matchedBank} size="xs" />}
                    <span>{acc.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Billing Frequency: Conta Recorrente (only Assinaturas / Educação) & Parcelamento (1x-24x on Credit) */}
          {!editingTransaction &&
            (canBeRecurringCategory || (paymentMethod === 'credit' && type === 'expense')) && (
              <div
                data-no-sheet-drag="true"
                className="flex flex-col gap-2 p-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)]"
              >
                {canBeRecurringCategory && (
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => setIsRecurring(false)}
                      className={`py-1.5 px-2 rounded-lg text-[11px] transition-transform duration-100 active:scale-95 truncate ${
                        !isRecurring
                          ? 'bg-[var(--primary)] text-black font-bold shadow-xs'
                          : 'text-[var(--text-muted)] font-semibold hover:text-[var(--text)]'
                      }`}
                    >
                      {paymentMethod === 'credit' && type === 'expense'
                        ? 'Único ou Parcelado (1x–24x)'
                        : 'Lançamento Único'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecurring(true);
                        setInstallmentsCount(1);
                      }}
                      className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] transition-transform duration-100 active:scale-95 truncate ${
                        isRecurring
                          ? 'bg-[var(--primary)] text-black font-bold shadow-xs'
                          : 'text-[var(--text-muted)] font-semibold hover:text-[var(--text)]'
                      }`}
                    >
                      <Repeat className="w-3 h-3 shrink-0" />
                      <span className="truncate">Conta Recorrente</span>
                    </button>
                  </div>
                )}

                {canBeRecurringCategory && isRecurring ? (
                  <div className="flex items-center justify-between gap-2 px-1 py-0.5 text-[11px]">
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--primary-bright)]">
                      <Repeat className="w-3.5 h-3.5 shrink-0" />
                      Cobrado todo mês automaticamente
                    </span>
                    <span className="text-[var(--text-muted)] tabular-nums shrink-0">
                      Dia {Number(date.split('-')[2]) || 1}
                      {amountCents > 0 ? ` · ${formatCentsToBRL(amountCents)}/mês` : ''}
                    </span>
                  </div>
                ) : (
                  paymentMethod === 'credit' &&
                  type === 'expense' && (
                    <>
                      <div className="flex items-center justify-between text-[11px] px-0.5">
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
                      <div
                        data-horizontal-scroll="true"
                        className="flex gap-1.5 overflow-x-auto no-scrollbar touch-pan-xy"
                      >
                        {INSTALLMENT_PRESETS.map((num) => {
                          const isSelected = installmentsCount === num;
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setInstallmentsCount(num)}
                              className={`touch-pan-xy px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-transform duration-100 active:scale-95 ${
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
                    </>
                  )
                )}
              </div>
            )}

              {/* Compact Numeric Keypad */}
              <NumericKeypad compact onKeyPress={handleKeyPress} />
            </div>
        )}
      </Sheet>

      {/* Native iOS-style Delete Confirmation Sheet */}
      <Sheet
        isOpen={showDeleteSheet}
        onClose={() => setShowDeleteSheet(false)}
        title={
          editingTransaction?.installment
            ? `Parcela ${editingTransaction.installment.number}/${editingTransaction.installment.total}`
            : editingTransaction?.recurringRuleId
              ? 'Conta recorrente'
              : 'Excluir lançamento?'
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            {editingTransaction?.installment
              ? 'Este gasto faz parte de uma compra parcelada. O que deseja excluir?'
              : editingTransaction?.recurringRuleId
                ? 'Esta é uma conta recorrente mensal. Deseja encerrar a recorrência ou excluir só este mês?'
                : 'Tem certeza que deseja excluir este lançamento?'}
          </p>

          {editingTransaction?.installment ? (
            <>
              <Button variant="danger" size="lg" fullWidth onClick={handleDeleteAllInstallments}>
                Excluir todas as parcelas (inclusive concluídas)
              </Button>
              <Button variant="secondary" size="lg" fullWidth onClick={handleDeleteFutureInstallments}>
                Excluir esta e próximas parcelas
              </Button>
              <Button variant="secondary" size="lg" fullWidth onClick={handleDeleteSingle}>
                Excluir apenas esta parcela
              </Button>
            </>
          ) : editingTransaction?.recurringRuleId ? (
            <>
              <Button variant="danger" size="lg" fullWidth onClick={handleDeleteRecurring}>
                Encerrar conta recorrente e excluir lançamentos
              </Button>
              <Button variant="secondary" size="lg" fullWidth onClick={handleDeleteSingle}>
                Excluir apenas este mês
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
