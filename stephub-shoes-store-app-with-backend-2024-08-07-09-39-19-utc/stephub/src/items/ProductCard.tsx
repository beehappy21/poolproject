import React from 'react';
import {theme} from '../constants';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {product} from '../product';

type Props = {
  item: any;
  isLast?: boolean;
  version?: number;
};

export const ProductCard: React.FC<Props> = ({isLast, item, version = 1}) => {
  const navigate = hooks.useAppNavigate();

  // Home > BestSeller item //
  if (version === 1) {
    return (
      <div
        style={{
          width: 200,
          cursor: 'pointer',
          marginRight: isLast ? 20 : 14,
          borderRadius: 12,
        }}
        onClick={() => {
          navigate('/product', {state: {item}});
        }}
      >
        <custom.ImageBackground
          imageUrl={item.image}
          style={{
            width: 200,
            height: 250,
            borderRadius: 12,
            marginBottom: 6,
            position: 'relative',
          }}
        >
          <product.ProductInWishlist
            item={item}
            style={{
              position: 'absolute',
              padding: 10,
              right: 0,
            }}
          />
          <product.ProductInCart
            item={item}
            style={{
              position: 'absolute',
              right: 0,
              top: 40,
              padding: 10,
            }}
          />
        </custom.ImageBackground>
        <div
          style={{
            width: 200,
            flexDirection: 'column',
            textAlign: 'left',
          }}
        >
          <div style={{marginBottom: 2}}>
            <product.ProductRating rating={item.rating} />
          </div>
          <h6
            style={{
              fontSize: 14,
              display: 'inline-block',
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
              fontWeight: 400,
              textAlign: 'left',
              marginTop: 0,
              marginBottom: 3,
              lineHeight: 1.5,
            }}
          >
            {item.name}
          </h6>
          <product.ProductPrice item={item} />
        </div>
      </div>
    );
  }

  // Shop Item
  if (version === 2) {
    return (
      <div
        style={{
          width: `calc(50% - 7.5px)`,
          cursor: 'pointer',
          borderRadius: 12,
          marginBottom: 20,
        }}
        onClick={() => {
          navigate('/product', {state: {item}});
        }}
      >
        <custom.ImageBackground
          imageUrl={item.image}
          style={{
            width: '100%',
            height: 170,
            borderRadius: 12,
            marginBottom: 6,
            position: 'relative',
            backgroundSize: 'contain',
            backgroundColor: theme.colors.imageBackground,
          }}
        >
          <product.ProductInWishlist
            item={item}
            style={{
              position: 'absolute',
              margin: 10,
              right: 0,
              top: 0,
              zIndex: 3,
            }}
          />
          <product.ProductInCart
            item={item}
            style={{
              position: 'absolute',
              margin: 10,
              right: 0,
              top: 46 - 10,
            }}
          />
        </custom.ImageBackground>
        <div
          style={{
            width: 200,
            flexDirection: 'column',
            textAlign: 'left',
          }}
        >
          <div style={{marginBottom: 5}}>
            <product.ProductRating
              rating={item.rating}
              ratingCount={item.ratingCount}
            />
          </div>
          <h6
            style={{
              marginTop: 0,
              marginBottom: 6,
              fontSize: 14,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
              fontWeight: 400,
            }}
          >
            {item.name}
          </h6>
          <product.ProductPrice item={item} />
        </div>
      </div>
    );
  }

  // Featured Item
  if (version === 3) {
    const blockWidth = 138;

    return (
      <div
        style={{
          width: blockWidth,
          cursor: 'pointer',
          marginRight: isLast ? 20 : 14,
          borderRadius: 12,
        }}
        onClick={() => {
          navigate('/product', {state: {item}});
        }}
      >
        <custom.ImageBackground
          imageUrl={item.image}
          style={{
            width: blockWidth,
            height: 170,
            borderRadius: 12,
            marginBottom: 6,
            position: 'relative',
            backgroundSize: 'contain',
            backgroundColor: theme.colors.imageBackground,
          }}
        >
          <product.ProductInWishlist
            item={item}
            style={{
              position: 'absolute',
              padding: 10,
              right: 0,
            }}
          />
          <product.ProductInCart
            item={item}
            style={{
              position: 'absolute',
              right: 0,
              top: 40,
              padding: 10,
            }}
          />
        </custom.ImageBackground>
        <div
          style={{
            width: blockWidth,
            flexDirection: 'column',
            textAlign: 'left',
          }}
        >
          <div style={{marginBottom: 2}}>
            <product.ProductRating rating={item.rating} />
          </div>
          <h6
            style={{
              fontSize: 14,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
              fontWeight: 400,
              marginTop: 0,
              marginBottom: 3,
              lineHeight: 1.5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.name}
          </h6>
          <product.ProductPrice item={item} />
        </div>
      </div>
    );
  }

  return null;
};
