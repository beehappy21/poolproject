import {createSlice, PayloadAction} from '@reduxjs/toolkit';

type Type = {firstLaunch: boolean};

const initialState: Type = {firstLaunch: true};

const firstLaunchSlice = createSlice({
  name: 'firstLaunchSlice',
  initialState,
  reducers: {
    setFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.firstLaunch = action.payload;
    },
  },
});

export const {setFirstLaunch} = firstLaunchSlice.actions;

export {firstLaunchSlice};
