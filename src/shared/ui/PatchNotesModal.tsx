import React from 'react';
import { Sparkles, Mic, Layers, Tv, CreditCard, Zap } from 'lucide-react';
import { Sheet } from '@/shared/ui/Sheet';
import { Button } from '@/shared/ui/Button';
import { SubscriptionLogo } from '@/shared/ui/SubscriptionLogo';
import { BankLogo } from '@/shared/ui/BankLogo';
import { POPULAR_SUBSCRIPTIONS } from '@/shared/lib/subscriptions';
import { BRAZILIAN_BANKS } from '@/shared/lib/banks';
import { PATCH_NOTES_MAX_DAYS, usePatchNotesModalStore } from '@/shared/lib/patchNotes';

const PREVIEW_SUBSCRIPTION_IDS = [
  'netflix',
  'spotify',
  'hbomax',
  'primevideo',
  'disneyplus',
  'youtube',
] as const;

const PREVIEW_BANK_IDS = [
  'nubank',
  'itau',
  'inter',
  'bradesco',
  'santander',
  'bb',
  'sicredi',
] as const;

export const PatchNotesModal: React.FC = () => {
  const { isOpen, shownDayNumber, close } = usePatchNotesModalStore();

  const previewSubscriptions = POPULAR_SUBSCRIPTIONS.filter((sub) =>
    (PREVIEW_SUBSCRIPTION_IDS as readonly string[]).includes(sub.id)
  );
  const previewBanks = BRAZILIAN_BANKS.filter((bank) =>
    (PREVIEW_BANK_IDS as readonly string[]).includes(bank.id)
  );

  return (
    <Sheet
      isOpen={isOpen}
      onClose={close}
      title="Novidades no Fechô"
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={close}
          className="text-base font-bold min-h-[48px] rounded-2xl"
        >
          Entendi, vamos lá!
        </Button>
      }
    >
      <div className="flex flex-col gap-3.5 pb-1">
        {/* Hero Card matching Home gradient emerald dark card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)]/18 via-[#141416] to-[#141416] border border-[var(--primary)]/30 p-4 flex flex-col gap-2">
          <div className="inline-flex items-center self-start gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary-bright)]">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>
              Atualização do sistema · Dia {shownDayNumber}/{PATCH_NOTES_MAX_DAYS}
            </span>
          </div>

          <h2 className="text-lg font-extrabold text-[var(--text)] tracking-tight leading-snug">
            Tudo que entrou nesta atualização
          </h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Melhorias pensadas para deixar seus lançamentos mais rápidos, inteligentes e seguros.
          </p>
        </div>

        {/* 1. Voice Builder */}
        <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3.5 flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary-bright)] flex items-center justify-center shrink-0">
              <Mic className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text)]">Lançamento por Voz ao Vivo</h3>
                <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary-bright)] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                  Novo
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                Dentro do botão <strong className="text-[var(--text)]">+</strong>, toque em{' '}
                <strong className="text-[var(--text)]">Falar</strong> e diga um ou mais gastos ou receitas (ex.: &ldquo;Gastei 35 de Uber no Pix e 55,90 da Netflix no cartão&rdquo;). Os cards montam ao vivo e você confirma com 1 toque.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Bulk Installment Edit */}
        <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3.5 flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Layers className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text)]">Alteração em Lote de Parcelas</h3>
                <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary-bright)] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                  Novo
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                Parcelamentos em até <strong className="text-[var(--text)]">24x</strong> no cartão. Ao editar a categoria, cartão, descrição ou valor de qualquer parcela, todas as parcelas da mesma compra atualizam juntas — inclusive as já concluídas.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Popular Subscriptions */}
        <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3.5 flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
              <Tv className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text)]">Assinaturas Populares com Logos</h3>
                <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary-bright)] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                  Novo
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                Ao escolher a categoria <strong className="text-[var(--text)]">Assinaturas</strong>, selecione entre 16 serviços populares com preenchimento em 1 toque e exibição da logo nos lançamentos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pl-12 flex-wrap">
            {previewSubscriptions.map((sub) => (
              <SubscriptionLogo key={sub.id} subscription={sub} size="sm" />
            ))}
          </div>
        </div>

        {/* 4. Brazilian Banks in Accounts */}
        <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3.5 flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text)]">Bancos em Contas e Cartões</h3>
                <span className="px-2 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary-bright)] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                  Novo
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                15 bancos brasileiros com logo ao cadastrar contas ou cartões, cálculo automático de fatura e opção de excluir contas com desfazer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pl-12 flex-wrap">
            {previewBanks.map((bank) => (
              <BankLogo key={bank.id} bank={bank} size="sm" />
            ))}
          </div>
        </div>

        {/* 5. 60/120Hz Smoothness & Sync */}
        <div className="rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] p-3.5 flex flex-col gap-2">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Zap className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text)]">Fluidez 60/120Hz e Nuvem Segura</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[var(--text-muted)] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                  Melhoria
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                Animações nativas na taxa de atualização da tela, rolagem livre sobre categorias, exclusão por swipe e sincronização na nuvem com proteção total dos seus dados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
};
