import {store} from '../store';
import {useRefresh} from './useRefresh';
import {useNavigate} from 'react-router-dom';
import {useWindowSize} from './useWindowSize';
import {useViewability} from './useViewability';
import {useDispatch, useSelector, TypedUseSelectorHook} from 'react-redux';

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useAppNavigate = () => useNavigate();

export const hooks = {
  useRefresh,
  useWindowSize,
  useAppDispatch,
  useAppSelector,
  useViewability,
  useAppNavigate,
};
