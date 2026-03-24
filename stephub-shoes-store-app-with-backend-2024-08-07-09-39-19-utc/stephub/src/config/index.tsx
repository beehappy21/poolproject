const MAIN_URL = 'https://george-fx.github.io/stephub/';
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, '') ||
  'http://127.0.0.1:3000';
const BAO_BASE_URL =
  process.env.REACT_APP_BAO_BASE_URL?.replace(/\/+$/, '') ||
  'http://127.0.0.1:8001';

export const GET_TAGS = `${MAIN_URL}api/tags.json`;
export const GET_ORDERS = `${MAIN_URL}api/orders.json`;
export const GET_REVIEWS = `${MAIN_URL}api/reviews.json`;
export const GET_BANNERS = `${BAO_BASE_URL}/api/banners`;
export const GET_CAROUSEL = `${BAO_BASE_URL}/api/slides`;
export const GET_PRODUCTS = `${MAIN_URL}api/products.json`;
export const GET_AUDIENCES = `${MAIN_URL}api/audiences.json`;
export const GET_PROMOCODES = `${MAIN_URL}api/promocodes.json`;
export const GET_CATEGORIES = `${BAO_BASE_URL}/api/categories`;
export const GET_PACKAGES = `${API_BASE_URL}/packages`;
export const GET_PRODUCT_CATEGORIES = `${API_BASE_URL}/products/categories`;
export const GET_STOREFRONT_PRODUCTS = `${API_BASE_URL}/products/storefront`;
export const AUTH_LOGIN = `${API_BASE_URL}/auth/login`;
export const AUTH_ME = `${API_BASE_URL}/auth/me`;
export const AUTH_DASHBOARD = `${API_BASE_URL}/auth/dashboard`;
export const AUTH_PROFILE = `${API_BASE_URL}/auth/profile`;
export const AUTH_CHANGE_PASSWORD = `${API_BASE_URL}/auth/change-password`;
export const AUTH_ORDERS = `${API_BASE_URL}/auth/orders`;
export const AUTH_COMMISSIONS = `${API_BASE_URL}/auth/commissions`;
export const AUTH_MATRIX = `${API_BASE_URL}/auth/matrix`;
export const AUTH_WALLETS_TRANSFER = `${API_BASE_URL}/auth/wallets/transfer`;
export const AUTH_WITHDRAW_REQUESTS = `${API_BASE_URL}/auth/withdraw-requests`;
export const AUTH_SHIPPING_ADDRESSES = `${API_BASE_URL}/auth/shipping-addresses`;
export const AUTH_PAYMENT_INSTRUCTIONS = `${API_BASE_URL}/auth/payment-instructions`;
export const GET_COMMISSION_SETTINGS = `${API_BASE_URL}/settings/commissions`;
export const GET_MATRIX_SETTINGS = `${API_BASE_URL}/settings/matrix`;
export const GET_SIGNUP_SHARE_SETTINGS = `${API_BASE_URL}/settings/signup-share`;
export const buildMemberDirectReferralsUrl = (memberCode: string) =>
  `${API_BASE_URL}/members/by-code/${encodeURIComponent(memberCode)}/direct-referrals`;
export const buildMemberReferralLinkUrl = (memberCode: string) =>
  `${API_BASE_URL}/members/by-code/${encodeURIComponent(memberCode)}/referral-link`;

export const buildAuthOrderDetailUrl = (orderId: string | number) =>
  `${AUTH_ORDERS}/${orderId}`;

export const buildSubmitTransferSlipUrl = (orderId: string | number) =>
  `${AUTH_ORDERS}/${orderId}/submit-transfer-slip`;

export const buildSetDefaultShippingAddressUrl = (
  shippingAddressId: string | number,
) => `${AUTH_SHIPPING_ADDRESSES}/${shippingAddressId}/default`;

export const URLS = {
  API_BASE_URL,
  BAO_BASE_URL,
  GET_TAGS,
  GET_ORDERS,
  GET_BANNERS,
  GET_REVIEWS,
  GET_CAROUSEL,
  GET_PRODUCTS,
  GET_AUDIENCES,
  GET_PROMOCODES,
  GET_CATEGORIES,
  GET_PACKAGES,
  GET_PRODUCT_CATEGORIES,
  GET_STOREFRONT_PRODUCTS,
  AUTH_LOGIN,
  AUTH_ME,
  AUTH_DASHBOARD,
  AUTH_PROFILE,
  AUTH_CHANGE_PASSWORD,
  AUTH_ORDERS,
  AUTH_COMMISSIONS,
  AUTH_MATRIX,
  AUTH_WALLETS_TRANSFER,
  AUTH_WITHDRAW_REQUESTS,
  AUTH_SHIPPING_ADDRESSES,
  AUTH_PAYMENT_INSTRUCTIONS,
  GET_COMMISSION_SETTINGS,
  GET_MATRIX_SETTINGS,
  GET_SIGNUP_SHARE_SETTINGS,
  buildMemberDirectReferralsUrl,
  buildMemberReferralLinkUrl,
  buildAuthOrderDetailUrl,
  buildSubmitTransferSlipUrl,
  buildSetDefaultShippingAddressUrl,
};
