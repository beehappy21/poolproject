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
  isConfigured: boolean;
};

type WindowWithLiff = Window & {
  liff?: {
    init(input: {liffId: string}): Promise<void>;
    isLoggedIn(): boolean;
    isInClient(): boolean;
    login(input?: {redirectUri?: string}): void;
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

  return {
    liffId,
    oaId,
    oaUrl,
    isConfigured: Boolean(liffId || oaUrl || oaId),
  };
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
