import {createSlice, PayloadAction} from '@reduxjs/toolkit';

type State = {phoneVerified: boolean; emailVerified: boolean};

const initialState: State = {phoneVerified: false, emailVerified: false};

export const verificationSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setPhoneVerified: (state, action: PayloadAction<boolean>) => {
      state.phoneVerified = action.payload;
    },
    setEmailVerified: (state, action: PayloadAction<boolean>) => {
      state.emailVerified = action.payload;
    },
  },
});

export const {setPhoneVerified, setEmailVerified} = verificationSlice.actions;
