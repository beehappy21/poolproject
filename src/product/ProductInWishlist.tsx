import React from 'react';

import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {ProductType} from '../types';
import {actions} from '../store/actions';

type Props = {
  version?: number;
  item: ProductType;
  style?: object;
};

export const ProductInWishlist: React.FC<Props> = ({
  item,
  version = 1,
  style,
}) => {
  const dispatch = hooks.useAppDispatch();

  const wishlist = hooks.useAppSelector(state => state.wishlistSlice.list);
  const itemExist = (item: ProductType) => wishlist.find(i => i.id === item.id);

  const fillColor = itemExist(item)
    ? theme.colors.coralRed
    : theme.colors.transparent;
  const strokeColor = itemExist(item)
    ? theme.colors.coralRed
    : theme.colors.textColor;

  if (version === 1) {
    return (
      <button
        style={{
          margin: 0,
          padding: 0,
          lineHeight: 0,
          borderRadius: 4,
          pointerEvents: 'auto',
          ...style,
        }}
        onClick={(event: any) => {
          event.stopPropagation();

          if (itemExist(item)) {
            dispatch(actions.removeFromWishlist(item));
          }

          if (!itemExist(item)) {
            dispatch(actions.addToWishlist(item));
          }
        }}
      >
        <svg.HeartSvg fillColor={fillColor} strokeColor={strokeColor} />
      </button>
    );
  }

  if (version === 2) {
    return (
      <button
        style={{
          lineHeight: 0,
          borderRadius: 44 / 2,
          ...style,
        }}
        onClick={(event: any) => {
          event.stopPropagation();

          if (itemExist(item)) {
            dispatch(actions.removeFromWishlist(item));
          }

          if (!itemExist(item)) {
            dispatch(actions.addToWishlist(item));
          }
        }}
      >
        <svg.BigHeartSvg fillColor={fillColor} strokeColor={strokeColor} />
      </button>
    );
  }

  return null;
};
