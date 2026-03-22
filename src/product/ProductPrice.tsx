import React, {CSSProperties} from 'react';

import {theme} from '../constants';
import {ProductType} from '../types';

type Props = {
  item: ProductType;
  containerStyle?: CSSProperties;
};

export const ProductPrice: React.FC<Props> = ({containerStyle, item}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        ...containerStyle,
      }}
    >
      {item.oldPrice && (
        <span
          style={{
            marginRight: 4,
            color: theme.colors.textColor,
            textDecorationLine: 'line-through',
            ...theme.fonts.Mulish_400Regular,
            fontSize: 12,
          }}
        >
          ${item.oldPrice}
        </span>
      )}
      <span
        style={{
          fontSize: item.oldPrice ? 14 : 12,
          ...theme.fonts.Mulish_600SemiBold,
          color: item.oldPrice ? theme.colors.coralRed : theme.colors.mainColor,
        }}
      >
        ${item.price}
      </span>
    </div>
  );
};
