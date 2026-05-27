import type {ProductType} from '../../types';
import {createSlice, PayloadAction} from '@reduxjs/toolkit';

type CartType = {
  total: number;
  delivery: number;
  discount: number;
  subtotal: number;
  promoCode: string;
  list: ProductType[];
  discountAmount: number;
  discountWalletAmount: number;
};

const initialState: CartType = {
  total: 0,
  list: [],
  delivery: 0,
  discount: 0,
  subtotal: 0,
  promoCode: '',
  discountAmount: 0,
  discountWalletAmount: 0,
};

type StateType = typeof initialState;

export type CartPromotionLine = {
  productId: number;
  originalUnitPrice: number;
  effectiveUnitPrice: number;
  quantity: number;
  discountAmount: number;
};

export type CartPricingSummary = {
  originalSubtotal: number;
  promotionSubtotal: number;
  promotionDiscountAmount: number;
  lines: CartPromotionLine[];
};

const normalizeNumber = (value: unknown): number => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const promotionGroupKeyForItem = (item: ProductType): string | null => {
  const promotionStatus = String(item.promotionStatus || '').toUpperCase();
  const promotionMinQuantity = normalizeNumber(item.promotionMinQuantity);
  const promotionPrice = normalizeNumber(item.promotionPrice);
  const promotionPv = normalizeNumber(item.promotionPv);
  const pv = normalizeNumber(item.pv);

  if (
    promotionStatus !== 'ACTIVE' ||
    promotionMinQuantity < 2 ||
    promotionPrice <= 0 ||
    promotionPv <= 0
  ) {
    return null;
  }

  if (pv === 100) {
    return `100pv:${promotionMinQuantity}:${promotionPrice}:${promotionPv}`;
  }

  return `detail:${item.productDetailId || item.id}:${promotionMinQuantity}:${promotionPrice}:${promotionPv}`;
};

export const calculateCartPricing = (
  list: ProductType[],
): CartPricingSummary => {
  const groupQuantities = new Map<string, number>();

  list.forEach(item => {
    const groupKey = promotionGroupKeyForItem(item);

    if (!groupKey) {
      return;
    }

    const quantity = Math.max(1, normalizeNumber(item.quantity || 1));
    groupQuantities.set(groupKey, (groupQuantities.get(groupKey) || 0) + quantity);
  });

  const lines = list.map(item => {
    const quantity = Math.max(1, normalizeNumber(item.quantity || 1));
    const originalUnitPrice = normalizeNumber(item.price);
    const promotionMinQuantity = normalizeNumber(item.promotionMinQuantity);
    const promotionPrice = normalizeNumber(item.promotionPrice);
    const groupKey = promotionGroupKeyForItem(item);
    const promotionApplies =
      groupKey !== null &&
      promotionMinQuantity >= 2 &&
      (groupQuantities.get(groupKey) || 0) >= promotionMinQuantity;
    const effectiveUnitPrice = promotionApplies
      ? promotionPrice
      : originalUnitPrice;

    return {
      productId: item.id,
      originalUnitPrice,
      effectiveUnitPrice,
      quantity,
      discountAmount: Math.max(0, originalUnitPrice - effectiveUnitPrice) * quantity,
    };
  });

  const originalSubtotal = lines.reduce(
    (sum, line) => sum + line.originalUnitPrice * line.quantity,
    0,
  );
  const promotionSubtotal = lines.reduce(
    (sum, line) => sum + line.effectiveUnitPrice * line.quantity,
    0,
  );

  return {
    originalSubtotal,
    promotionSubtotal,
    promotionDiscountAmount: Math.max(0, originalSubtotal - promotionSubtotal),
    lines,
  };
};

const recalculateCartTotals = (state: StateType) => {
  const pricing = calculateCartPricing(state.list);
  const subtotal = pricing.promotionSubtotal;

  state.subtotal = subtotal;
  state.discountAmount = Math.max(
    0,
    Math.min(Number(state.discountWalletAmount || 0), subtotal),
  );
  state.total = Math.max(0, subtotal - state.discountAmount);
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (
      state: StateType = initialState,
      action: PayloadAction<ProductType>,
    ) => {
      const inCart = state.list.find(item => item.id === action.payload.id);

      if (inCart) {
        state.list.map((item: ProductType) => {
          if (item.id === action.payload.id) {
            item.dcwSpendEnabled = action.payload.dcwSpendEnabled;
            item.dcwUsageAmount = action.payload.dcwUsageAmount;
            item.dcwRewardRate = action.payload.dcwRewardRate;
            item.productDetailId =
              action.payload.productDetailId ?? item.productDetailId;
            if (item.quantity) {
              item.quantity += 1;
            }
          }
          return item;
        }, state);
      } else {
        state.list.push({
          ...action.payload,
          quantity: 1,
        });
      }

      recalculateCartTotals(state);
    },
    removeFromCart: (state, action: PayloadAction<ProductType>) => {
      const inCart = state.list.find(item => item.id === action.payload.id);

      if (inCart) {
        state.list.map(item => {
          if (item.id === action.payload.id && (item.quantity as number) > 1) {
            if (item.quantity) {
              item.quantity -= 1;
            }
          } else if (item.id === action.payload.id && item.quantity === 1) {
            state.list.splice(state.list.indexOf(item), 1);
          }
          return item;
        }, state);

        if (state.list.length === 0) {
          state.discount = 0;
          state.promoCode = '';
          state.discountWalletAmount = 0;
        }

        recalculateCartTotals(state);
      }
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
      recalculateCartTotals(state);
    },
    setDiscountWalletAmount: (state, action: PayloadAction<number>) => {
      state.discountWalletAmount = Math.max(0, Number(action.payload || 0));
      recalculateCartTotals(state);
    },
    resetCart: state => {
      state.list = [];
      state.subtotal = 0;
      state.total = 0;
      state.discount = 0;
      state.promoCode = '';
      state.delivery = 0;
      state.discountAmount = 0;
      state.discountWalletAmount = 0;
    },
    setPromoCode: (state, action: PayloadAction<string>) => {
      state.promoCode = action.payload;
    },
  },
});

export const {
  addToCart,
  resetCart,
  setDiscount,
  setDiscountWalletAmount,
  setPromoCode,
  removeFromCart,
} =
  cartSlice.actions;

export default cartSlice.reducer;
