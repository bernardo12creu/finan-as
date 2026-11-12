import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldCheck, PieChart, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { NumericKeypad } from '@/shared/ui/NumericKeypad';
import { formatCentsToBRL, keypadInputToCents } from '@/shared/lib/money';
import { getCurrentCompetence } from '@/shared/lib/dates';
import { budgetRepository } from '@/data/repositories/local/localRepository';

export const OnboardingView: React.FC = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [initialBudgetCents, setInitialBudgetCents] = useState(400000); // R$ 4.000,00 default

  const slides = [
    {
      icon: <Zap className="w-10 h-10 text-[var(--primary)]" />,
      title: 'Gastos em até 3 toques',
      description:
        'Toque no botão central, digite o valor com nosso teclado inteligente e selecione a categoria. Simples e direto.',
    },
    {
      icon: <ShieldCheck className="w-10 h-10 text-[var(--primary)]" />,
      title: '100% Offline e Privado',
      description:
        'Seus dados financeiros ficam salvos exclusivamente no seu celular. Funciona sem internet em qualquer lugar.',
    },
    {
      icon: <PieChart className="w-10 h-10 text-[var(--primary)]" />,
      title: 'Fechamento Mensal sem Mistério',
      description:
        'No fim de cada mês, veja seu resumo consolidado no estilo Wrapped e entenda com clareza para onde foi o seu dinheiro.',
    },
  ];

  const handleFinish = async () => {
    if (initialBudgetCents > 0) {
      await budgetRepository.setBudget(getCurrentCompetence(), null, initialBudgetCents);
    }
    localStorage.setItem('fecho_onboarded', 'true');
    navigate('/');
  };

  const handleSkip = () => {
    localStorage.setItem('fecho_onboarded', 'true');
    navigate('/');
  };

  return (
    <div className="flex-1 w-full h-full flex flex-col justify-between overflow-hidden overscroll-none px-6 pt-[calc(max(env(safe-area-inset-top,0px),16px)+6px)] pb-[calc(max(env(safe-area-inset-bottom,0px),16px)+12px)] max-w-md mx-auto bg-[var(--bg)]">
      {/* Top bar with skip button */}
      <div className="flex justify-end pt-2">
        {slide < 3 && (
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] py-2 px-3"
          >
            Pular
          </button>
        )}
      </div>

      {/* Main Slide Carousel */}
      <div className="flex-1 flex flex-col justify-center items-center text-center my-auto">
        <AnimatePresence mode="wait">
          {slide < 3 ? (
            <motion.div
              key={slide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center max-w-xs"
            >
              <div className="w-20 h-20 rounded-3xl bg-[var(--surface-2)] flex items-center justify-center mb-6 border border-[var(--border)] shadow-lg shadow-[rgba(34,197,94,0.05)]">
                {slides[slide].icon}
              </div>
              <h2 className="text-2xl font-extrabold text-[var(--text)] tracking-tight mb-3">
                {slides[slide].title}
              </h2>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {slides[slide].description}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="budget-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center w-full"
            >
              <h2 className="text-xl font-bold text-[var(--text)] mb-1">
                Defina sua meta mensal
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Quanto você planeja gastar no total neste mês? (Pode alterar depois)
              </p>

              <div className="text-3xl font-black tabular-nums text-[var(--primary-bright)] mb-4">
                {formatCentsToBRL(initialBudgetCents)}
              </div>

              <NumericKeypad
                onKeyPress={(key) =>
                  setInitialBudgetCents((prev) => keypadInputToCents(prev, key))
                }
                className="max-w-xs"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Slide Indicators & Navigation buttons */}
      <div className="flex flex-col gap-4 pb-4">
        {slide < 3 ? (
          <>
            <div className="flex justify-center gap-2 mb-2">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    slide === idx
                      ? 'w-6 bg-[var(--primary)]'
                      : 'w-1.5 bg-[var(--surface-2)]'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setSlide((s) => s + 1)}
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleFinish}
          >
            Começar a Usar
            <Check className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};
