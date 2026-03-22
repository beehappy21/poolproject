import React from 'react';
import {theme} from '../constants';

import {hooks} from '../hooks';
import {ProductType} from '../types';
import {actions} from '../store/actions';

type Props = {item: ProductType};

const renderMinusSvg = () => (
  <svg width={14} height={14} fill='none'>
    <path
      stroke='#23374A'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.2}
      d='M2.898 7h8.114'
    />
  </svg>
);

const renderPlusSvg = () => (
  <svg width={14} height={14} fill='none'>
    <path
      stroke='#23374A'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={1.2}
      d='M6.955 2.917v8.166M2.898 7h8.114'
    />
  </svg>
);

export const ProductCounterInner: React.FC<Props> = ({item}) => {
  const dispatch = hooks.useAppDispatch();

  const cart = hooks.useAppSelector(state => state.cartSlice.list);

  const quantityInCart = (item: ProductType, cart: ProductType[]): number => {
    const ifItemInCart = cart.find(el => el.id === item.id);
    const quantity =
      ifItemInCart && ifItemInCart.quantity ? ifItemInCart.quantity : 0;
    return quantity;
  };

  const quantity = quantityInCart(item, cart);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        borderColor: '#E8EFF4',
        border: 'solid 1px #E8EFF4',
      }}
    >
      <button
        onClick={() => {
          dispatch(actions.removeFromCart(item));
        }}
        style={{
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 13,
          paddingBottom: 13,
          marginRight: 10,
          borderRadius: 12,
        }}
      >
        {renderMinusSvg()}
      </button>
      <div
        style={{
          ...theme.fonts.Mulish_600SemiBold,
          fontSize: 14,
          color: theme.colors.textColor,
          lineHeight: 1.5,
          marginBottom: 2,
        }}
      >
        {quantity || 0}
      </div>
      <button
        onClick={() => {
          dispatch(actions.addToCart(item));
        }}
        style={{
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 13,
          paddingBottom: 13,
          marginLeft: 10,
          borderRadius: 12,
        }}
      >
        {renderPlusSvg()}
      </button>
    </div>
  );
};
