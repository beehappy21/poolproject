import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';

type FilterState = {
  selectedTags: string[];
  selectedSizes: string[];
  selectedColors: string[];
  selectedRatings: number[];
  selectedCategories: string[];
};

const initialState: FilterState = {
  selectedTags: [],
  selectedSizes: [],
  selectedColors: [],
  selectedRatings: [],
  selectedCategories: [],
};

export const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setSelectedTags: (state, action: PayloadAction<string[]>) => {
      state.selectedTags = action.payload;
    },
    setSelectedColors: (state, action: PayloadAction<string[]>) => {
      state.selectedColors = action.payload;
    },
    setSelectedSizes: (state, action: PayloadAction<string[]>) => {
      state.selectedSizes = action.payload;
    },
    setSelectedRatings: (state, action: PayloadAction<number[]>) => {
      state.selectedRatings = action.payload;
    },
    setSelectedCategories: (state, action: PayloadAction<string[]>) => {
      state.selectedCategories = action.payload;
    },
    resetFilters: state => {
      state.selectedTags = [];
      state.selectedSizes = [];
      state.selectedColors = [];
      state.selectedRatings = [];
      state.selectedCategories = [];
    },
  },
});

export const {
  resetFilters,
  setSelectedTags,
  setSelectedSizes,
  setSelectedColors,
  setSelectedRatings,
  setSelectedCategories,
} = filterSlice.actions;
