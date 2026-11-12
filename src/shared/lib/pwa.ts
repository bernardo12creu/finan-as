export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const platform = window.navigator.platform || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1)
  );
}

export function shouldShowIosInstallHint(): boolean {
  if (typeof window === 'undefined') return false;
  if (!isIosDevice() || isStandalonePwa()) return false;
  try {
    return localStorage.getItem('fecho_ios_install_dismissed') !== 'true';
  } catch {
    return true;
  }
}

export function dismissIosInstallHint(): void {
  try {
    localStorage.setItem('fecho_ios_install_dismissed', 'true');
  } catch {
    // ignore storage errors
  }
}

/**
 * Forces edge-to-edge screen height inside iOS standalone PWAs and clears any
 * WebKit viewport shrinkage/scroll drift after keyboard dismissal.
 */
export function installIosViewportSync(): () => void {
  if (typeof window === 'undefined') return () => {};

  const apply = () => {
    const root = document.documentElement;
    if (!isIosDevice() || !isStandalonePwa()) {
      root.style.removeProperty('--app-height');
      return;
    }

    const isPortrait =
      window.matchMedia?.('(orientation: portrait)').matches ??
      window.innerHeight >= window.innerWidth;
    const screenHeight = isPortrait ? window.screen.height : window.screen.width;

    if (screenHeight > 0 && window.innerHeight <= screenHeight) {
      root.style.setProperty('--app-height', `${screenHeight}px`);
    } else {
      root.style.removeProperty('--app-height');
    }

    if (window.scrollY !== 0 || window.scrollX !== 0) {
      window.scrollTo(0, 0);
    }
  };

  apply();

  let timer1: number | undefined;
  let timer2: number | undefined;
  const onFocusOut = () => {
    window.clearTimeout(timer1);
    window.clearTimeout(timer2);
    timer1 = window.setTimeout(apply, 60);
    timer2 = window.setTimeout(apply, 260);
  };

  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  window.addEventListener('focusout', onFocusOut);
  window.visualViewport?.addEventListener('resize', apply);

  return () => {
    window.clearTimeout(timer1);
    window.clearTimeout(timer2);
    window.removeEventListener('resize', apply);
    window.removeEventListener('orientationchange', apply);
    window.removeEventListener('focusout', onFocusOut);
    window.visualViewport?.removeEventListener('resize', apply);
  };
}
