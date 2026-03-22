import React from 'react';

import {theme} from '../constants';

type Props = {
  item: any;
  style?: object;
};

export const ProductSale: React.FC<Props> = ({item, style}) => {
  if (item.oldPrice) {
    return (
      <div
        style={{
          backgroundColor: '#51BA74',
          alignSelf: 'flex-start',
          paddingLeft: 6,
          paddingRight: 6,
          paddingTop: 1,
          paddingBottom: 2,
          borderRadius: 6,
          color: theme.colors.white,
          textTransform: 'uppercase',
          ...theme.fonts.Mulish_700Bold,
          fontSize: 8,
          lineHeight: 1.7,
          ...style,
        }}
      >
        sale
      </div>
    );
  }

  return null;
};
