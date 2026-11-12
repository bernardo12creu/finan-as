import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/data/supabaseClient';
import { Button } from '@/shared/ui/Button';
import { Sheet } from '@/shared/ui/Sheet';
import { showToast } from '@/shared/ui/toastStore';

type AuthMode = 'login' | 'signup';

function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'Este e-mail já está cadastrado. Tente entrar na sua conta.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  }
  if (lower.includes('password should be at least') || lower.includes('at least 6 characters')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'Digite um endereço de e-mail válido.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Muitas tentativas em sequência. Aguarde alguns instantes e tente de novo.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Sem conexão com a internet. Verifique seu sinal e tente novamente.';
  }
  return message || 'Não foi possível autenticar. Tente novamente.';
}

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  // Forgot password sheet state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!cleanEmail) {
      setErrorMsg('Digite seu e-mail.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (mode === 'signup' && !cleanName) {
      setErrorMsg('Digite como gostaria de ser chamado.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) {
          setErrorMsg(translateAuthError(error.message));
          return;
        }
        showToast({ message: 'Bem-vindo de volta!', type: 'success' });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: cleanName,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          setErrorMsg(translateAuthError(error.message));
          return;
        }
        if (!data.session) {
          setPendingConfirmationEmail(cleanEmail);
        } else {
          showToast({ message: 'Conta criada com sucesso!', type: 'success' });
        }
      }
    } catch {
      setErrorMsg('Erro inesperado ao conectar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!pendingConfirmationEmail) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingConfirmationEmail,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        showToast({ message: translateAuthError(error.message), type: 'error' });
      } else {
        showToast({ message: 'E-mail de confirmação reenviado!', type: 'success' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = resetEmail.trim().toLowerCase();
    if (!clean) {
      showToast({ message: 'Digite seu e-mail', type: 'error' });
      return;
    }
    setIsSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(clean, {
        redirectTo: window.location.origin,
      });
      if (error) {
        showToast({ message: translateAuthError(error.message), type: 'error' });
      } else {
        showToast({ message: 'Link de recuperação enviado para seu e-mail!', type: 'success' });
        setIsResetOpen(false);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  if (pendingConfirmationEmail) {
    return (
      <div className="flex-1 w-full h-full flex flex-col justify-between max-w-md mx-auto bg-[var(--bg)] text-[var(--text)] px-6 pt-[max(env(safe-area-inset-top,0px),24px)] pb-[max(env(safe-area-inset-bottom,0px),24px)] overflow-y-auto ios-scroll">
        <div className="my-auto flex flex-col items-center text-center gap-5 py-8">
          <div className="w-16 h-16 rounded-3xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary-bright)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-2 max-w-xs">
            <h1 className="text-2xl font-extrabold tracking-tight">Confirme seu e-mail</h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Enviamos um link de confirmação para{' '}
              <span className="text-[var(--text)] font-semibold">{pendingConfirmationEmail}</span>.
              Toque no link para ativar sua conta e entrar.
            </p>
          </div>

          <div className="w-full flex flex-col gap-2.5 mt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              onClick={handleResendConfirmation}
            >
              Reenviar e-mail de confirmação
            </Button>
            <Button
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => {
                setPendingConfirmationEmail(null);
                setMode('login');
              }}
            >
              Voltar para Entrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 w-full h-full flex flex-col max-w-md mx-auto bg-[var(--bg)] text-[var(--text)] overflow-y-auto overflow-x-hidden ios-scroll">
      {/* Ambient top glow extending cleanly behind iPhone Dynamic Island */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.18),transparent_70%)]" />

      <div className="relative z-10 flex-1 flex flex-col justify-between px-6 pt-[calc(max(env(safe-area-inset-top,0px),18px)+16px)] pb-[calc(max(env(safe-area-inset-bottom,0px),18px)+12px)]">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-16 h-16 rounded-[20px] bg-[#121613] border border-[#22C55E]/30 flex items-center justify-center shadow-[0_0_32px_rgba(34,197,94,0.18)] mb-4">
            <svg width="36" height="36" viewBox="0 0 512 512" fill="none" aria-hidden="true">
              <circle cx="256" cy="256" r="180" stroke="#22C55E" strokeWidth="28" strokeOpacity="0.35" />
              <path
                d="M170 260L230 320L342 192"
                stroke="#22C55E"
                strokeWidth="40"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[var(--text)]">Fechô</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Controle pessoal e seguro em qualquer lugar
          </p>
        </div>

        {/* Auth Card */}
        <div className="my-auto py-6 flex flex-col gap-5">
          {/* iOS Segmented Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#161618] border border-white/[0.07]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] ${
                mode === 'login'
                  ? 'bg-[#26262A] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`py-2.5 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] ${
                mode === 'signup'
                  ? 'bg-[#26262A] text-[var(--text)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="auth-name"
                  className="text-xs font-semibold text-[var(--text-muted)] px-1"
                >
                  Seu nome
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Ex: Bernardo"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#161618] border border-white/[0.09] text-[var(--text)] placeholder-[var(--text-muted)]/70 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--primary)] transition-colors min-h-[50px]"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-email"
                className="text-xs font-semibold text-[var(--text-muted)] px-1"
              >
                E-mail
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
                <input
                  id="auth-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161618] border border-white/[0.09] text-[var(--text)] placeholder-[var(--text-muted)]/70 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--primary)] transition-colors min-h-[50px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <label
                  htmlFor="auth-password"
                  className="text-xs font-semibold text-[var(--text-muted)]"
                >
                  Senha
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setIsResetOpen(true);
                    }}
                    className="text-xs font-semibold text-[var(--primary-bright)] hover:underline"
                  >
                    Esqueci a senha
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 pointer-events-none" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Sua senha' : 'Mínimo de 6 caracteres'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#161618] border border-white/[0.09] text-[var(--text)] placeholder-[var(--text-muted)]/70 rounded-2xl pl-10 pr-12 py-3 focus:outline-none focus:border-[var(--primary)] transition-colors min-h-[50px]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-xs text-[var(--danger)] font-medium leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              className="mt-2 min-h-[52px] text-base font-bold rounded-2xl"
            >
              {mode === 'login' ? 'Entrar no Fechô' : 'Criar minha conta'}
              {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </div>

        <p className="text-[11px] text-center text-[var(--text-muted)]/80 pb-1">
          Cada conta possui seu próprio painel financeiro isolado e sincronizado na nuvem.
        </p>
      </div>

      {/* Password Reset Sheet */}
      <Sheet isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title="Recuperar senha">
        <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Informe o e-mail da sua conta para receber um link de redefinição de senha.
          </p>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="voce@exemplo.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-2xl px-4 py-3 focus:outline-none focus:border-[var(--primary)] min-h-[48px]"
          />
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSendingReset}>
            Enviar link de recuperação
          </Button>
        </form>
      </Sheet>
    </div>
  );
};
