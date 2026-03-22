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
};

const initialState: CartType = {
  total: 0,
  list: [],
  delivery: 0,
  discount: 0,
  subtotal: 0,
  promoCode: '',
  discountAmount: 0,
};

type StateType = typeof initialState;

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
            if (item.quantity) {
              item.quantity += 1;
            }
          }
          return item;
        }, state);
        state.subtotal += Number(action.payload.price);
        state.discountAmount = Number(
          (state.subtotal - state.total).toFixed(2),
        );
        state.total +=
          Number(action.payload.price) * (1 - state.discount / 100);
      } else {
        state.list.push({
          ...action.payload,
          quantity: 1,
        });
        state.subtotal += Number(action.payload.price);
        state.total +=
          Number(action.payload.price) * (1 - state.discount / 100);
      }
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
        state.subtotal -= Number(action.payload.price);
        state.discountAmount = Number(
          (state.subtotal - state.total).toFixed(2),
        );
        state.total -=
          Number(action.payload.price) * (1 - state.discount / 100);

        if (state.list.length === 0) {
          state.discount = 0;
          state.promoCode = '';
        }
      }
    },
    setDiscount: (state, action: PayloadAction<number>) => {
      if (state.list.length === 0) {
        state.discount = 0;
      } else {
        state.discount = action.payload;
      }
      const newTotal = state.subtotal * (1 - state.discount / 100);
      state.discountAmount = Number((state.subtotal - newTotal).toFixed(2));
      state.total = state.subtotal * (1 - state.discount / 100);
    },
    resetCart: state => {
      state.list = [];
      state.subtotal = 0;
      state.total = 0;
      state.discount = 0;
      state.promoCode = '';
      state.delivery = 0;
      state.discountAmount = 0;
    },
    setPromoCode: (state, action: PayloadAction<string>) => {
      state.promoCode = action.payload;
    },
  },
});

export const {addToCart, resetCart, setDiscount, setPromoCode, removeFromCart} =
  cartSlice.actions;

export default cartSlice.reducer;
