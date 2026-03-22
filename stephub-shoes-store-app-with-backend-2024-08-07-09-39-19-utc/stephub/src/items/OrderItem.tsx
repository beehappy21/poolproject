import React from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {product} from '../product';
import {theme} from '../constants';
import {ProductType} from '../types';

type Props = {item: ProductType; isLast: boolean};

export const OrderItem: React.FC<Props> = ({item, isLast}) => {
  const navigate = hooks.useAppNavigate();

  const renderImage = (): JSX.Element => {
    return (
      <button
        onClick={() => navigate('/product', {state: {item}})}
        style={{borderRadius: 12}}
      >
        <custom.ImageBackground
          imageUrl={item.image}
          style={{
            width: 100,
            height: '100%',
            borderRadius: 12,
            backgroundColor: theme.colors.imageBackground,
          }}
        >
          <product.ProductSale item={item} style={{margin: 10}} />
        </custom.ImageBackground>
      </button>
    );
  };

  const renderInfo = (): JSX.Element => {
    return (
      <div
        style={{
          borderColor: theme.colors.antiFlashWhite,
          width: '100%',
          paddingRight: 0,
          flexDirection: 'row',
          flex: 1,
          display: 'flex',
        }}
      >
        <div
          style={{
            marginRight: 'auto',
            paddingLeft: 14,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 2,
            paddingBottom: 2,
          }}
        >
          <h6
            style={{
              ...theme.fonts.Mulish_400Regular,
              fontSize: 14,
              lineHeight: 1.5,
              margin: 0,
              color: theme.colors.textColor,
              fontWeight: 400,
              marginBottom: 4,
            }}
          >
            {item.name}
          </h6>
          <product.ProductPrice
            item={item}
            containerStyle={{marginBottom: 'auto'}}
          />
          <span
            style={{
              ...theme.fonts.Mulish_400Regular,
              fontSize: 14,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            {item.packageCode
              ? `Package code: ${item.packageCode}`
              : `Size: ${item.size ? item.size : 'No size'}`}
          </span>
          <span
            style={{
              fontSize: 14,
              color: theme.colors.textColor,
              marginRight: 14,
              lineHeight: 1.5,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {item.packageCode
              ? `PV: ${item.pv || 0}`
              : `Color: ${item.color ? item.color : 'No color'}`}
          </span>
        </div>
        <product.ProductCounter item={item} />
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: 100,
        padding: '0 20px',
        marginBottom: isLast ? 20 : 14,
      }}
    >
      {renderImage()}
      {renderInfo()}
    </div>
  );
};
