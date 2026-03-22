import React from 'react';

import {svg} from '../assets/svg';
import {theme} from '../constants';
import {ProductType} from '../types';
import {actions} from '../store/actions';
import {hooks, RootState} from '../hooks';

type Props = {
  version?: number;
  item: ProductType;
  style?: object;
};

export const ProductInCart: React.FC<Props> = ({item, style, version = 1}) => {
  const dispatch = hooks.useAppDispatch();
  const cart = hooks.useAppSelector((state: RootState) => state.cartSlice.list);
  const exist = (item: ProductType) => cart.find(i => i.id === item.id);

  const strokeColor = exist(item)
    ? theme.colors.coralRed
    : theme.colors.textColor;

  if (version === 1) {
    return (
      <button
        style={{
          zIndex: 1,
          borderRadius: 12,
          pointerEvents: 'auto',
          cursor: 'pointer',
          ...style,
        }}
        onClick={(event: any) => {
          event.stopPropagation();
          if (exist(item)) {
            dispatch(actions.removeFromCart(item));
          }
          if (!exist(item)) {
            dispatch(actions.addToCart(item));
          }
        }}
      >
        <svg.BagSvg strokeColor={strokeColor} />
      </button>
    );
  }

  if (version === 2) {
    return (
      <button
        style={{
          zIndex: 1,
          borderRadius: 12,
          pointerEvents: 'auto',
          cursor: 'pointer',
          ...style,
        }}
        onClick={(event: any) => {
          event.stopPropagation();
          if (exist(item)) {
            dispatch(actions.removeFromCart(item));
          }
          if (!exist(item)) {
            dispatch(actions.addToCart(item));
          }
        }}
      >
        <svg.WishlistBagSvg />
      </button>
    );
  }

  return null;
};
