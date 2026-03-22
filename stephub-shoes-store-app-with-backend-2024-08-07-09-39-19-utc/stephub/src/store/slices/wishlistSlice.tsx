import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

import type {ProductType} from '../../types';

type WishlistState = {list: ProductType[]};

const initialState: WishlistState = {
  list: [],
};

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action: PayloadAction<ProductType>) => {
      const inWishlist = state.list.find(item => item.id === action.payload.id);

      if (!inWishlist) {
        state.list.push({
          ...action.payload,
        });
      }
    },
    removeFromWishlist: (state, action: PayloadAction<ProductType>) => {
      const inWishlist = state.list.find(item => item.id === action.payload.id);

      if (inWishlist) {
        state.list = state.list.filter(item => item.id !== action.payload.id);
      }
    },
    setWishlist: (state, action: PayloadAction<ProductType[]>) => {
      state.list = action.payload;
    },
    updateList: (state, action: PayloadAction<ProductType[]>) => {
      state.list = action.payload;
    },
    resetWishlist: state => {
      state.list = [];
    },
  },
});

export const {
  addToWishlist,
  removeFromWishlist,
  setWishlist,
  updateList,
  resetWishlist,
} = wishlistSlice.actions;
