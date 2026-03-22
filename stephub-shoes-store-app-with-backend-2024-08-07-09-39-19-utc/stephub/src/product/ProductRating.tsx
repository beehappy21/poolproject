import React from 'react';

import {theme} from '../constants';

type Props = {
  rating: number;
  ratingCount?: number;
  ratingNumber?: boolean;
  containerStyle?: object;
};

export const ProductRating: React.FC<Props> = ({
  rating,
  ratingCount,
  containerStyle,
  ratingNumber = true,
}) => {
  const renderStars = () => {
    return (
      <svg width={68} height={12} fill='none'>
        <g>
          <path
            fill={rating >= 1 ? '#F5C102' : theme.colors.white}
            stroke='#F5C102'
            strokeLinecap='round'
            strokeLinejoin='round'
            d='m6 1 1.545 3.13L11 4.635 8.5 7.07l.59 3.44L6 8.885 2.91 10.51l.59-3.44L1 4.635l3.455-.505L6 1Z'
          />
        </g>
        <g>
          <path
            fill={rating >= 2 ? '#F5C102' : theme.colors.white}
            stroke='#F5C102'
            strokeLinecap='round'
            strokeLinejoin='round'
            d='m20 1 1.545 3.13L25 4.635 22.5 7.07l.59 3.44L20 8.885l-3.09 1.625.59-3.44L15 4.635l3.455-.505L20 1Z'
          />
        </g>
        <g>
          <path
            fill={rating >= 3 ? '#F5C102' : theme.colors.white}
            stroke='#F5C102'
            strokeLinecap='round'
            strokeLinejoin='round'
            d='m34 1 1.545 3.13L39 4.635 36.5 7.07l.59 3.44L34 8.885l-3.09 1.625.59-3.44L29 4.635l3.455-.505L34 1Z'
          />
        </g>
        <g>
          <path
            fill={rating >= 4 ? '#F5C102' : theme.colors.white}
            stroke='#F5C102'
            strokeLinecap='round'
            strokeLinejoin='round'
            d='m48 1 1.545 3.13L53 4.635 50.5 7.07l.59 3.44L48 8.885l-3.09 1.625.59-3.44L43 4.635l3.455-.505L48 1Z'
          />
        </g>
        <g>
          <path
            fill={rating >= 5 ? '#F5C102' : theme.colors.white}
            stroke='#F5C102'
            strokeLinecap='round'
            strokeLinejoin='round'
            d='m62 1 1.545 3.13L67 4.635 64.5 7.07l.59 3.44L62 8.885l-3.09 1.625.59-3.44L57 4.635l3.455-.505L62 1Z'
          />
        </g>
      </svg>
    );
  };

  const renderRatingText = (): JSX.Element | null => {
    if (!ratingNumber) return null;

    return (
      <div
        style={{
          marginLeft: 4,
          color: theme.colors.textColor,
          fontSize: 12,
          lineHeight: 1.7,
          ...theme.fonts.Mulish_400Regular,
        }}
      >
        {ratingCount ? `(${ratingCount})` : null}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        ...containerStyle,
      }}
    >
      {renderStars()}
      {renderRatingText()}
    </div>
  );
};
