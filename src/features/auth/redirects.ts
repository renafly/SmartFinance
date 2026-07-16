const PENDING_REDIRECT_KEY = 'smartfinance.pendingRedirectTo';
const DEFAULT_AUTH_REDIRECT = '/(protected)';

function canUseSessionStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage);
}

export function normalizeRedirectTo(value: unknown): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== 'string') return null;

  const trimmed = rawValue.trim();

  if (!trimmed.startsWith('/')) return null;
  if (trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('/google-auth')) return null;
  if (trimmed.startsWith('/login')) return null;
  if (trimmed.startsWith('/(auth)')) return null;
  if (trimmed.startsWith('/(public)')) return null;

  return trimmed;
}

export function buildCurrentRedirectTo(pathname: string, params: Record<string, unknown> = {}) {
  const windowPath =
    typeof window !== 'undefined' && window.location
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : null;

  if (windowPath) {
    return normalizeRedirectTo(windowPath);
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) searchParams.append(key, String(item));
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();

  return normalizeRedirectTo(`${pathname}${queryString ? `?${queryString}` : ''}`);
}

export function storePendingRedirectTo(value: unknown) {
  const redirectTo = normalizeRedirectTo(value);

  if (!redirectTo || !canUseSessionStorage()) return redirectTo;

  window.sessionStorage.setItem(PENDING_REDIRECT_KEY, redirectTo);

  return redirectTo;
}

export function peekPendingRedirectTo(value?: unknown) {
  const redirectTo = normalizeRedirectTo(value);

  if (redirectTo) return redirectTo;

  if (!canUseSessionStorage()) return null;

  return normalizeRedirectTo(window.sessionStorage.getItem(PENDING_REDIRECT_KEY));
}

export function consumePendingRedirectTo(value?: unknown) {
  const redirectTo = peekPendingRedirectTo(value);

  if (canUseSessionStorage()) {
    window.sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  }

  return redirectTo ?? DEFAULT_AUTH_REDIRECT;
}
