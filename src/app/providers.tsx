import React, { useEffect, useRef, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { bootstrapForAuthUser } from './bootstrap';
import { supabase } from '@/data/supabaseClient';
import { useSessionStore } from '@/data/session';
import { AuthView } from '@/features/auth/components/AuthView';
import { ToastContainer } from '@/shared/ui/Toast';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const AppProviders: React.FC = () => {
  const [authReady, setAuthReady] = useState(false);
  const { isAuthenticated } = useSessionStore();
  const bootstrappedUserIdRef = useRef<string | null>(null);

  // Silent automatic PWA Service Worker updates so mobile clients always get fresh iOS builds
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    const onControllerChange = () => {
      if (hadController && !reloading) {
        reloading = true;
        window.location.reload();
      }
      hadController = true;
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      if (!r) return;
      const checkUpdate = () => {
        void r.update().catch(() => {});
      };
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkUpdate();
        }
      });
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  // Reset iOS Safari / Standalone viewport drift whenever keyboard dismisses
  useEffect(() => {
    const handleFocusOut = () => {
      window.setTimeout(() => {
        window.scrollTo(0, 0);
      }, 60);
    };
    window.addEventListener('focusout', handleFocusOut);
    return () => window.removeEventListener('focusout', handleFocusOut);
  }, []);

  // Auth lifecycle: check active session and listen to sign-in / sign-out transitions
  useEffect(() => {
    let mounted = true;

    const handleUser = async (user: Parameters<typeof bootstrapForAuthUser>[0] | null) => {
      if (!mounted) return;
      if (!user) {
        bootstrappedUserIdRef.current = null;
        useSessionStore.getState().clearSession();
        setAuthReady(true);
        return;
      }

      if (bootstrappedUserIdRef.current !== user.id || !useSessionStore.getState().isAuthenticated) {
        bootstrappedUserIdRef.current = user.id;
        try {
          await bootstrapForAuthUser(user);
        } catch (err) {
          console.error('Failed to bootstrap authenticated user', err);
        }
      }
      if (mounted) {
        setAuthReady(true);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => handleUser(data.session?.user ?? null))
      .catch(() => handleUser(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-[#0A0A0A] text-[var(--text)] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="w-[72px] h-[72px] rounded-[20px] bg-[#121613] border border-[#22C55E]/30 flex items-center justify-center shadow-[0_0_36px_rgba(34,197,94,0.16)] animate-pulse">
          <svg width="42" height="42" viewBox="0 0 512 512" fill="none" aria-hidden="true">
            <circle cx="256" cy="256" r="180" stroke="#22C55E" strokeWidth="26" strokeOpacity="0.35" />
            <path
              d="M170 260L230 320L342 192"
              stroke="#22C55E"
              strokeWidth="38"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? <RouterProvider router={router} /> : <AuthView />}
      <ToastContainer />
    </>
  );
};
