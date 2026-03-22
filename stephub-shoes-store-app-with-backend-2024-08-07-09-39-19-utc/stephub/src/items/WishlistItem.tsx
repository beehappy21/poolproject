import React from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {theme} from '../constants';
import {product} from '../product';
import {ProductType} from '../types';

type Props = {item: ProductType; containerStyle?: any; isLast?: boolean};

export const WishlistItem: React.FC<Props> = ({
  item,
  isLast,
  containerStyle,
}): JSX.Element => {
  const navigate = hooks.useAppNavigate();

  return (
    <div>
      <div
        style={{
          ...containerStyle,
          display: 'flex',
          flexDirection: 'row',
          borderBottomWidth: 1,
          paddingLeft: 20,
          width: '100%',
          paddingBottom: 20,
          borderBottom: isLast
            ? 'none'
            : `1px solid ${theme.colors.aliceBlue2}`,
          marginBottom: 20,
        }}
      >
        <button
          style={{borderRadius: 12}}
          onClick={() => {
            navigate('/product', {state: {item}});
          }}
        >
          <custom.ImageBackground
            imageUrl={item.image}
            style={{
              width: 100,
              height: 100,
              borderRadius: 12,
              backgroundColor: theme.colors.imageBackground,
            }}
          >
            {item.oldPrice && (
              <div
                style={{
                  display: 'flex',
                  height: 16,
                  backgroundColor: '#51BA74',
                  paddingLeft: 6,
                  paddingRight: 6,
                  borderRadius: 6,
                  color: theme.colors.white,
                  textTransform: 'uppercase',
                  ...theme.fonts.Mulish_700Bold,
                  fontSize: 8,
                  lineHeight: 1.3,
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                sale
              </div>
            )}
          </custom.ImageBackground>
        </button>
        <div
          style={{
            flex: 1,
            height: 100,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <div style={{paddingLeft: 14}}>
            <h6
              style={{
                margin: 0,
                fontSize: 14,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_400Regular,
                lineHeight: 1.5,
                fontWeight: 400,
                marginBottom: 3,
              }}
            >
              {item.name}
            </h6>
            <product.ProductPrice
              item={item}
              containerStyle={{marginBottom: 9}}
            />
            <product.ProductRating rating={item.rating} />
          </div>
          <div
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <product.ProductInWishlist
              item={item}
              version={1}
              style={{
                paddingLeft: 20,
                paddingRight: 20,
                paddingBottom: 10,
              }}
            />
            <product.ProductInCart
              item={item}
              version={2}
              style={{
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 10,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
