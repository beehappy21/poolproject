const MAIN_URL = 'https://george-fx.github.io/stephub/';

const PUBLIC_WAP_HOSTS = new Set([
  'wap.blifehealthy.com',
  'www.blifehealthy.com',
  'blifehealthy.com',
]);

const getRuntimeHostname = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.hostname.toLowerCase();
};

const getDefaultApiBaseUrl = (): string => {
  const hostname = getRuntimeHostname();
  if (PUBLIC_WAP_HOSTS.has(hostname)) {
    return 'https://api.blifehealthy.com';
  }

  return '/api';
};

const getDefaultBaoBaseUrl = (): string => {
  const hostname = getRuntimeHostname();
  if (PUBLIC_WAP_HOSTS.has(hostname)) {
    return 'https://bao.blifehealthy.com';
  }

  return '/bao-api';
};

const normalizeConfiguredBaseUrl = (value?: string): string => {
  const normalized = value?.replace(/\/+$/, '') || '';
  if (!normalized) {
    return '';
  }

  const hostname = getRuntimeHostname();
  if (normalized === '/api' && PUBLIC_WAP_HOSTS.has(hostname)) {
    return 'https://api.blifehealthy.com';
  }
  if (normalized === '/bao-api' && PUBLIC_WAP_HOSTS.has(hostname)) {
    return 'https://bao.blifehealthy.com';
  }

  return normalized;
};

const API_BASE_URL =
  normalizeConfiguredBaseUrl(process.env.REACT_APP_API_BASE_URL) ||
  getDefaultApiBaseUrl();
const BAO_BASE_URL =
  normalizeConfiguredBaseUrl(process.env.REACT_APP_BAO_BASE_URL) ||
  getDefaultBaoBaseUrl();
const LINE_LIFF_ID = process.env.REACT_APP_LINE_LIFF_ID?.trim() || '';
const LINE_OA_ID = process.env.REACT_APP_LINE_OA_ID?.trim() || '';
const LINE_OA_URL = process.env.REACT_APP_LINE_OA_URL?.trim() || '';
const LINE_LOGIN_CALLBACK_URL =
  process.env.REACT_APP_LINE_LOGIN_CALLBACK_URL?.trim() || '';
const LINE_LIFF_SIGNIN_URL =
  process.env.REACT_APP_LINE_LIFF_SIGNIN_URL?.trim() || '';

export const GET_TAGS = `${MAIN_URL}api/tags.json`;
export const GET_ORDERS = `${MAIN_URL}api/orders.json`;
export const GET_REVIEWS = `${MAIN_URL}api/reviews.json`;
export const GET_BANNERS = `${BAO_BASE_URL}/api/banners`;
export const GET_CAROUSEL = `${BAO_BASE_URL}/api/slides`;
export const GET_PRODUCTS = `${MAIN_URL}api/products.json`;
export const GET_AUDIENCES = `${MAIN_URL}api/audiences.json`;
export const GET_PROMOCODES = `${MAIN_URL}api/promocodes.json`;
export const GET_CATEGORIES = `${BAO_BASE_URL}/api/categories`;
export const GET_PRODUCT_CATEGORIES = `${API_BASE_URL}/products/categories`;
export const GET_STOREFRONT_PRODUCTS = `${API_BASE_URL}/products/storefront`;
export const AUTH_LOGIN = `${API_BASE_URL}/auth/login`;
export const AUTH_LINE_LOGIN = `${API_BASE_URL}/auth/line-login`;
export const AUTH_LINE_BINDING_CHECK = `${API_BASE_URL}/auth/line-binding/check`;
export const AUTH_ME = `${API_BASE_URL}/auth/me`;
export const AUTH_LINE_BINDING = `${API_BASE_URL}/auth/line-binding`;
export const AUTH_DASHBOARD = `${API_BASE_URL}/auth/dashboard`;
export const AUTH_PROFILE = `${API_BASE_URL}/auth/profile`;
export const AUTH_CHANGE_PASSWORD = `${API_BASE_URL}/auth/change-password`;
export const AUTH_FORGOT_PASSWORD_RESET = `${API_BASE_URL}/auth/forgot-password-reset`;
export const AUTH_MATRIX_REENTRY = `${API_BASE_URL}/auth/matrix/reentry`;
export const AUTH_MATRIX_REENTRY_PREFERENCE = `${API_BASE_URL}/auth/matrix/reentry-preference`;
export const AUTH_ORDERS = `${API_BASE_URL}/auth/orders`;
export const AUTH_COMMISSIONS = `${API_BASE_URL}/auth/commissions`;
export const AUTH_NETWORK_TOP_LEADERS = `${API_BASE_URL}/auth/network-top-leaders`;
export const AUTH_MATRIX = `${API_BASE_URL}/auth/matrix`;
export const AUTH_MATRIX_PAYOUTS = `${API_BASE_URL}/auth/matrix-payouts`;
export const AUTH_POOL_PAYOUTS = `${API_BASE_URL}/auth/pool-payouts`;
export const AUTH_TRANSACTIONS = `${API_BASE_URL}/auth/transactions`;
export const AUTH_WALLETS_CONVERT = `${API_BASE_URL}/auth/wallets/convert`;
export const AUTH_WALLETS_TRANSFER = `${API_BASE_URL}/auth/wallets/transfer`;
export const AUTH_WALLETS_TRANSFER_RECIPIENTS = `${API_BASE_URL}/auth/wallets/transfer-recipients`;
export const AUTH_WALLET_TOPUP_REQUESTS = `${API_BASE_URL}/auth/wallets/topup-requests`;
export const AUTH_WITHDRAW_REQUESTS = `${API_BASE_URL}/auth/withdraw-requests`;
export const AUTH_KYC_REQUESTS = `${API_BASE_URL}/auth/kyc-requests`;
export const AUTH_SHIPPING_ADDRESSES = `${API_BASE_URL}/auth/shipping-addresses`;
export const AUTH_PAYMENT_INSTRUCTIONS = `${API_BASE_URL}/auth/payment-instructions`;
export const GET_COMMISSION_SETTINGS = `${API_BASE_URL}/settings/commissions`;
export const GET_MATRIX_SETTINGS = `${API_BASE_URL}/settings/matrix`;
export const GET_SIGNUP_SHARE_SETTINGS = `${API_BASE_URL}/settings/signup-share`;
export const buildMemberDirectReferralsUrl = (memberCode: string) =>
  `${API_BASE_URL}/members/by-code/${encodeURIComponent(memberCode)}/direct-referrals`;
export const buildMemberReferralLinkUrl = (memberCode: string) =>
  `${API_BASE_URL}/members/by-code/${encodeURIComponent(memberCode)}/referral-link`;
export const buildMemberByCodeUrl = (memberCode: string) =>
  `${API_BASE_URL}/members/by-code/${encodeURIComponent(memberCode)}`;
export const buildMatrixByMemberCodeUrl = (memberCode: string) =>
  `${API_BASE_URL}/matrix/member/by-code/${encodeURIComponent(memberCode)}`;
export const buildMatrixByMemberIdUrl = (memberId: string | number) =>
  `${API_BASE_URL}/matrix/member/${memberId}`;

export const buildAuthOrderDetailUrl = (orderId: string | number) =>
  `${AUTH_ORDERS}/${orderId}`;

export const buildProductReviewsUrl = (productDetailId: string | number) =>
  `${API_BASE_URL}/products/${productDetailId}/reviews`;

export const buildAuthProductReviewsUrl = (productDetailId: string | number) =>
  `${API_BASE_URL}/auth/products/${productDetailId}/reviews`;

export const buildSubmitTransferSlipUrl = (orderId: string | number) =>
  `${AUTH_ORDERS}/${orderId}/submit-transfer-slip`;

export const buildAuthOrderReceiptUrl = (orderId: string | number) =>
  `${AUTH_ORDERS}/${orderId}/receipt`;

export const buildSetDefaultShippingAddressUrl = (
  shippingAddressId: string | number,
) => `${AUTH_SHIPPING_ADDRESSES}/${shippingAddressId}/default`;

export const URLS = {
  API_BASE_URL,
  BAO_BASE_URL,
  LINE_LIFF_ID,
  LINE_OA_ID,
  LINE_OA_URL,
  LINE_LOGIN_CALLBACK_URL,
  LINE_LIFF_SIGNIN_URL,
  GET_TAGS,
  GET_ORDERS,
  GET_BANNERS,
  GET_REVIEWS,
  GET_CAROUSEL,
  GET_PRODUCTS,
  GET_AUDIENCES,
  GET_PROMOCODES,
  GET_CATEGORIES,
  GET_PRODUCT_CATEGORIES,
  GET_STOREFRONT_PRODUCTS,
  AUTH_LOGIN,
  AUTH_LINE_LOGIN,
  AUTH_LINE_BINDING_CHECK,
  AUTH_ME,
  AUTH_LINE_BINDING,
  AUTH_DASHBOARD,
  AUTH_PROFILE,
  AUTH_CHANGE_PASSWORD,
  AUTH_FORGOT_PASSWORD_RESET,
  AUTH_MATRIX_REENTRY,
  AUTH_MATRIX_REENTRY_PREFERENCE,
  AUTH_ORDERS,
  AUTH_COMMISSIONS,
  AUTH_NETWORK_TOP_LEADERS,
  AUTH_MATRIX,
  AUTH_MATRIX_PAYOUTS,
  AUTH_POOL_PAYOUTS,
  AUTH_TRANSACTIONS,
  AUTH_WALLETS_CONVERT,
  AUTH_WALLETS_TRANSFER,
  AUTH_WALLETS_TRANSFER_RECIPIENTS,
  AUTH_WALLET_TOPUP_REQUESTS,
  AUTH_WITHDRAW_REQUESTS,
  AUTH_KYC_REQUESTS,
  AUTH_SHIPPING_ADDRESSES,
  AUTH_PAYMENT_INSTRUCTIONS,
  GET_COMMISSION_SETTINGS,
  GET_MATRIX_SETTINGS,
  GET_SIGNUP_SHARE_SETTINGS,
  buildMemberByCodeUrl,
  buildMatrixByMemberCodeUrl,
  buildMatrixByMemberIdUrl,
  buildMemberDirectReferralsUrl,
  buildMemberReferralLinkUrl,
  buildAuthOrderDetailUrl,
  buildProductReviewsUrl,
  buildAuthProductReviewsUrl,
  buildSubmitTransferSlipUrl,
  buildAuthOrderReceiptUrl,
  buildSetDefaultShippingAddressUrl,
};
