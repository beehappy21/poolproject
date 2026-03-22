import React from 'react';
import {ReviewType} from '../types/ReviewType';

import {theme} from '../constants';
import {product} from '../product';

type Props = {
  item: ReviewType;
  isLast?: boolean;
};

export const ReviewItem: React.FC<Props> = ({item, isLast}): JSX.Element => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        marginBottom: isLast ? 0 : 20,
        paddingBottom: 20,
        borderWidth: 1,
        paddingRight: 20,
        paddingLeft: 20,
        borderBottom: isLast ? 'none' : '1px solid #e8eff4',
      }}
    >
      <img
        src={item.photo}
        alt='review'
        style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          marginRight: 10,
          objectFit: 'cover',
        }}
      />
      <div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 6,
            justifyContent: 'space-between',
          }}
        >
          <h5
            style={{
              textTransform: 'capitalize',
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              color: theme.colors.mainColor,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {item.name}
          </h5>
          <product.ProductRating rating={item.rating} ratingNumber={false} />
        </div>
        <p
          style={{
            fontSize: 10,
            marginBottom: 10,
            lineHeight: 1.5,
            marginTop: 0,
            color: theme.colors.textColor,
          }}
        >
          {item.date}
        </p>
        <p
          style={{
            color: theme.colors.textColor,
            fontSize: 14,
            lineHeight: 1.5,
            margin: 0,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          {item.comment}
        </p>
      </div>
    </div>
  );
};
