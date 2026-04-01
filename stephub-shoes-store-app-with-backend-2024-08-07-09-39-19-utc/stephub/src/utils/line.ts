import {URLS} from '../config';

export type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string | null;
  statusMessage?: string | null;
  idToken?: string | null;
};

type LineBootstrapResult = {
  isReady: boolean;
  isLoggedIn: boolean;
  isInClient: boolean;
  profile: LineProfile | null;
  errorMessage?: string;
};

type LineConfig = {
  liffId: string;
  oaId: string;
  oaUrl: string;
  callbackUrl: string;
  liffSignInUrl: string;
  isConfigured: boolean;
};

type WindowWithLiff = Window & {
  liff?: {
    init(input: {liffId: string}): Promise<void>;
    isLoggedIn(): boolean;
    isInClient(): boolean;
    login(input?: {redirectUri?: string}): void;
    shareTargetPicker?(
      messages: Array<{
        type: 'text';
        text: string;
      }>,
    ): Promise<unknown | null>;
    getIDToken?(): string | null;
    getProfile(): Promise<{
      userId: string;
      displayName: string;
      pictureUrl?: string;
      statusMessage?: string;
    }>;
  };
};

export const normalizeSponsorCode = (rawValue?: string | null): string => {
  const normalized = rawValue?.trim().toUpperCase() || '';
  return normalized || '';
};

export const extractSponsorCodeFromSearch = (search: string): string => {
  const query = new URLSearchParams(search);

  return normalizeSponsorCode(
    query.get('sponsorCode') || query.get('sponsor_code') || query.get('ref'),
  );
};

export const parseLineCallbackSearch = (search: string): URLSearchParams => {
  const directParams = new URLSearchParams(search);
  const liffState = directParams.get('liff.state')?.trim() || '';

  if (!liffState) {
    return directParams;
  }

  try {
    const decodedState = decodeURIComponent(liffState);
    const nestedParams = new URLSearchParams(
      decodedState.startsWith('?') ? decodedState.slice(1) : decodedState,
    );

    nestedParams.forEach((value, key) => {
      if (!directParams.has(key)) {
        directParams.set(key, value);
      }
    });
  } catch (error) {
    console.error(error);
  }

  return directParams;
};

export const buildSignUpPath = (sponsorCode?: string | null): string => {
  const normalizedSponsorCode = normalizeSponsorCode(sponsorCode);

  if (!normalizedSponsorCode) {
    return '/SignUp';
  }

  return `/SignUp?sponsorCode=${encodeURIComponent(normalizedSponsorCode)}`;
};

export const buildLineShareUrl = (message: string, targetUrl: string): string => {
  const text = [message.trim(), targetUrl.trim()].filter(Boolean).join('\n');
  return `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
};

export const isLineUserAgent = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Line\//i.test(navigator.userAgent || '');
};

export const getLineConfig = (): LineConfig => {
  const liffId = URLS.LINE_LIFF_ID?.trim() || '';
  const oaId = URLS.LINE_OA_ID?.trim() || '';
  const oaUrl = URLS.LINE_OA_URL?.trim() || '';
  const callbackUrl = URLS.LINE_LOGIN_CALLBACK_URL?.trim() || '';
  const liffSignInUrl = URLS.LINE_LIFF_SIGNIN_URL?.trim() || '';

  return {
    liffId,
    oaId,
    oaUrl,
    callbackUrl,
    liffSignInUrl,
    isConfigured: Boolean(liffId || oaUrl || oaId || callbackUrl || liffSignInUrl),
  };
};

export type LineEntryMode = 'signin' | 'signup' | 'connect';

export const resolveSafeReturnTo = (
  rawValue?: string | null,
  fallbackPath = '/TabNavigator',
): string => {
  const normalized = rawValue?.trim() || '';

  if (!normalized) {
    return fallbackPath;
  }

  if (normalized.startsWith('/')) {
    return normalized;
  }

  if (typeof window === 'undefined') {
    return fallbackPath;
  }

  try {
    const parsed = new URL(normalized, window.location.origin);

    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (error) {
    console.error(error);
  }

  return fallbackPath;
};

export const buildLineLiffEntryPath = (input?: {
  sponsorCode?: string | null;
  mode?: LineEntryMode;
  returnTo?: string | null;
}): string => {
  const query = new URLSearchParams();
  const sponsorCode = normalizeSponsorCode(input?.sponsorCode);
  const mode = input?.mode || 'signin';
  const returnTo = resolveSafeReturnTo(
    input?.returnTo || undefined,
    sponsorCode ? buildSignUpPath(sponsorCode) : '/TabNavigator',
  );

  query.set('mode', mode);

  if (sponsorCode) {
    query.set('sponsorCode', sponsorCode);
  }

  if (returnTo) {
    query.set('returnTo', returnTo);
  }

  return `/line/liff/signin?${query.toString()}`;
};

export const buildLineLiffEntryUrl = (input?: {
  sponsorCode?: string | null;
  mode?: LineEntryMode;
  returnTo?: string | null;
}): string => {
  const config = getLineConfig();
  const entryPath = buildLineLiffEntryPath(input);

  if (typeof window === 'undefined') {
    return config.liffSignInUrl || entryPath;
  }

  if (!config.liffSignInUrl) {
    return `${window.location.origin}${entryPath}`;
  }

  try {
    const parsed = new URL(config.liffSignInUrl);
    parsed.search = entryPath.includes('?') ? entryPath.split('?')[1] : '';
    return parsed.toString();
  } catch (error) {
    console.error(error);
    return config.liffSignInUrl;
  }
};

export const buildLineLiffLaunchUrl = (input?: {
  sponsorCode?: string | null;
  mode?: LineEntryMode;
  returnTo?: string | null;
}): string => {
  const config = getLineConfig();
  const entryPath = buildLineLiffEntryPath(input);
  const queryString = entryPath.includes('?') ? entryPath.split('?')[1] : '';

  if (!config.liffId) {
    return buildLineLiffEntryUrl(input);
  }

  const launchUrl = new URL(
    `https://liff.line.me/${encodeURIComponent(config.liffId)}`,
  );

  if (queryString) {
    launchUrl.search = queryString;
  }

  return launchUrl.toString();
};

export const buildLineLoginCallbackUrl = (input?: {
  sponsorCode?: string | null;
  mode?: LineEntryMode;
  returnTo?: string | null;
}): string => {
  const config = getLineConfig();
  const sponsorCode = normalizeSponsorCode(input?.sponsorCode);
  const returnTo = resolveSafeReturnTo(
    input?.returnTo || undefined,
    sponsorCode ? buildSignUpPath(sponsorCode) : '/TabNavigator',
  );

  if (!config.callbackUrl) {
    return buildLineLiffEntryUrl({
      sponsorCode,
      mode: input?.mode,
      returnTo,
    });
  }

  try {
    const parsed = new URL(config.callbackUrl);
    parsed.searchParams.set('mode', input?.mode || 'signin');
    if (sponsorCode) {
      parsed.searchParams.set('sponsorCode', sponsorCode);
    }
    if (returnTo) {
      parsed.searchParams.set('returnTo', returnTo);
    }
    return parsed.toString();
  } catch (error) {
    console.error(error);
    return config.callbackUrl;
  }
};

export const initializeLineLiff = async (): Promise<LineBootstrapResult> => {
  if (typeof window === 'undefined') {
    return {
      isReady: false,
      isLoggedIn: false,
      isInClient: false,
      profile: null,
    };
  }

  const config = getLineConfig();
  const runtimeWindow = window as WindowWithLiff;
  const liff = runtimeWindow.liff;

  if (!config.liffId) {
    return {
      isReady: false,
      isLoggedIn: false,
      isInClient: isLineUserAgent(),
      profile: null,
      errorMessage: config.isConfigured
        ? 'ยังไม่ได้ตั้งค่า LINE LIFF ID'
        : undefined,
    };
  }

  if (!liff) {
    return {
      isReady: false,
      isLoggedIn: false,
      isInClient: isLineUserAgent(),
      profile: null,
      errorMessage: 'LIFF SDK ยังไม่พร้อมใช้งาน',
    };
  }

  try {
    await liff.init({liffId: config.liffId});

    const isLoggedIn = liff.isLoggedIn();
    const isInClient = liff.isInClient();
    const profile = isLoggedIn ? await liff.getProfile() : null;

    return {
      isReady: true,
      isLoggedIn,
      isInClient,
      profile: profile
        ? {
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl || '',
            statusMessage: profile.statusMessage || '',
            idToken: liff.getIDToken ? liff.getIDToken() || '' : '',
          }
        : null,
    };
  } catch (error) {
    return {
      isReady: false,
      isLoggedIn: false,
      isInClient: isLineUserAgent(),
      profile: null,
      errorMessage:
        error instanceof Error ? error.message : 'LIFF initialization failed.',
    };
  }
};

export const startLineLogin = (redirectUri?: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const config = getLineConfig();
  const liff = (window as WindowWithLiff).liff;

  if (config.liffId && liff) {
    liff.login({
      redirectUri: redirectUri || window.location.href,
    });
    return true;
  }

  if (config.oaUrl) {
    window.location.href = config.oaUrl;
    return true;
  }

  return false;
};
