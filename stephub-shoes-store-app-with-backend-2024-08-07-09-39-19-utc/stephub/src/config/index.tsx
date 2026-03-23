const MAIN_URL = 'https://george-fx.github.io/stephub/';
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, '') ||
  'http://127.0.0.1:3000';

export const GET_TAGS = `${MAIN_URL}api/tags.json`;
export const GET_ORDERS = `${MAIN_URL}api/orders.json`;
export const GET_REVIEWS = `${MAIN_URL}api/reviews.json`;
export const GET_BANNERS = `${MAIN_URL}api/banners.json`;
export const GET_CAROUSEL = `${MAIN_URL}api/carousel.json`;
export const GET_PRODUCTS = `${MAIN_URL}api/products.json`;
export const GET_AUDIENCES = `${MAIN_URL}api/audiences.json`;
export const GET_PROMOCODES = `${MAIN_URL}api/promocodes.json`;
export const GET_CATEGORIES = `${MAIN_URL}api/categories.json`;
export const GET_PACKAGES = `${API_BASE_URL}/packages`;
export const AUTH_LOGIN = `${API_BASE_URL}/auth/login`;
export const AUTH_ME = `${API_BASE_URL}/auth/me`;
export const AUTH_ORDERS = `${API_BASE_URL}/auth/orders`;
export const AUTH_PAYMENT_INSTRUCTIONS = `${API_BASE_URL}/auth/payment-instructions`;

export const buildAuthOrderDetailUrl = (orderId: string | number) =>
  `${AUTH_ORDERS}/${orderId}`;

export const buildSubmitTransferSlipUrl = (orderId: string | number) =>
  `${AUTH_ORDERS}/${orderId}/submit-transfer-slip`;

export const URLS = {
  API_BASE_URL,
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
  AUTH_LOGIN,
  AUTH_ME,
  AUTH_ORDERS,
  AUTH_PAYMENT_INSTRUCTIONS,
  buildAuthOrderDetailUrl,
  buildSubmitTransferSlipUrl,
};
