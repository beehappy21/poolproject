import React from 'react';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {ProductType} from '../types';
import {actions} from '../store/actions';

type Props = {item: ProductType};

export const ProductCounter: React.FC<Props> = ({item}): JSX.Element => {
  const dispatch = hooks.useAppDispatch();

  const btnStyle: object = {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: theme.colors.aliceBlue2,
  };

  const addToCartButton = (): JSX.Element => {
    return (
      <button
        style={{...btnStyle}}
        onClick={() => {
          dispatch(actions.addToCart(item));
        }}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width={30}
          height={30}
          fill='none'
        >
          <rect
            width={29}
            height={29}
            x={0.5}
            y={0.5}
            stroke='#E8EFF4'
            rx={14.5}
          />
          <path
            stroke='#193364'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.2}
            d='M14.955 10.916v8.167M10.898 15h8.114'
          />
        </svg>
      </button>
    );
  };

  const removeFromCartButton = (): JSX.Element => {
    return (
      <button
        style={{...btnStyle}}
        onClick={() => {
          dispatch(actions.removeFromCart(item));
        }}
      >
        <svg width={30} height={30} fill='none'>
          <rect
            width={29}
            height={29}
            x={0.5}
            y={0.5}
            stroke='#E8EFF4'
            rx={14.5}
          />
          <path
            stroke='#193364'
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={1.2}
            d='M11 15h8.114'
          />
        </svg>
      </button>
    );
  };

  const renderQty = (): JSX.Element => {
    return (
      <span
        style={{
          ...theme.fonts.Mulish_400Regular,
          fontSize: 14,
          color: theme.colors.textColor,
        }}
      >
        {item.quantity}
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100%',
      }}
    >
      {addToCartButton()}
      {renderQty()}
      {removeFromCartButton()}
    </div>
  );
};
