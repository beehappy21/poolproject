import storage from 'redux-persist/lib/storage';
import {configureStore, combineReducers} from '@reduxjs/toolkit';
import {TypedUseSelectorHook, useDispatch, useSelector} from 'react-redux';

import {
  FLUSH,
  PAUSE,
  PURGE,
  PERSIST,
  REGISTER,
  REHYDRATE,
  PersistConfig,
  createTransform,
  persistStore,
  persistReducer,
} from 'redux-persist';

import {tabSlice} from './slices/tabSlice';
import {userSlice} from './slices/userSlice';
import {cartSlice} from './slices/cartSlice';
import {filterSlice} from './slices/filterSlice';
import {paymentSlice} from './slices/paymentSlice';
import {wishlistSlice} from './slices/wishlistSlice';
import {promocodeSlice} from './slices/promocodeSlice';
import {firstLaunchSlice} from './slices/firstLaunchSlice';
import {verificationSlice} from './slices/verificationSlice';

const rootReducer = combineReducers({
  tabSlice: tabSlice.reducer,
  userSlice: userSlice.reducer,
  cartSlice: cartSlice.reducer,
  filterSlice: filterSlice.reducer,
  paymentSlice: paymentSlice.reducer,
  wishlistSlice: wishlistSlice.reducer,
  promocodeSlice: promocodeSlice.reducer,
  firstLaunchSlice: firstLaunchSlice.reducer,
  verificationSlice: verificationSlice.reducer,
});
type RootReducerState = ReturnType<typeof rootReducer>;

const userSliceTransform = createTransform(
  (inboundState: {user: unknown; rememberMe: boolean}) => {
    if (inboundState.rememberMe) {
      return inboundState;
    }

    return {
      ...inboundState,
      user: null,
    };
  },
  outboundState => outboundState,
  {whitelist: ['userSlice']},
);

const persistConfig: PersistConfig<RootReducerState> = {
  key: 'root-v2',
  storage,
  transforms: [userSliceTransform],
  whitelist: [
    'userSlice',
    'firstLaunchSlice',
  ],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const persistor = persistStore(store);
