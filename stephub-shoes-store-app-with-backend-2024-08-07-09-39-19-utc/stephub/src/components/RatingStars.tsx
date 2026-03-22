import React from 'react';

type Props = {
  containerStyle?: object;
  setRating: (value: number) => void;
  rating: number;
};

export const RatingStars: React.FC<Props> = ({
  containerStyle,
  setRating,
  rating,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'row',
        ...containerStyle,
      }}
    >
      <button
        onClick={() => {
          setRating(1);
          setRating(rating === 1 ? 0 : 1);
        }}
        style={{marginRight: 4, borderRadius: 20}}
      >
        <svg width={40} height={40} fill='none'>
          <path
            d='m20 3.333 5.15 10.434 11.517 1.683-8.334 8.117L30.3 35.033 20 29.617 9.7 35.033l1.967-11.466-8.334-8.117 11.517-1.683L20 3.333Z'
            fill={rating >= 1 ? '#F5C102' : '#E8EFF4'}
          />
        </svg>
      </button>
      <button
        onClick={() => setRating(2)}
        style={{marginRight: 4, borderRadius: 20}}
      >
        <svg width={40} height={40} fill='none'>
          <path
            d='m20 3.333 5.15 10.434 11.517 1.683-8.334 8.117L30.3 35.033 20 29.617 9.7 35.033l1.967-11.466-8.334-8.117 11.517-1.683L20 3.333Z'
            fill={rating >= 2 ? '#F5C102' : '#E8EFF4'}
          />
        </svg>
      </button>
      <button
        onClick={() => setRating(3)}
        style={{marginRight: 4, borderRadius: 20}}
      >
        <svg width={40} height={40} fill='none'>
          <path
            d='m20 3.333 5.15 10.434 11.517 1.683-8.334 8.117L30.3 35.033 20 29.617 9.7 35.033l1.967-11.466-8.334-8.117 11.517-1.683L20 3.333Z'
            fill={rating >= 3 ? '#F5C102' : '#E8EFF4'}
          />
        </svg>
      </button>
      <button
        onClick={() => setRating(4)}
        style={{marginRight: 4, borderRadius: 20}}
      >
        <svg width={40} height={40} fill='none'>
          <path
            d='m20 3.333 5.15 10.434 11.517 1.683-8.334 8.117L30.3 35.033 20 29.617 9.7 35.033l1.967-11.466-8.334-8.117 11.517-1.683L20 3.333Z'
            fill={rating >= 4 ? '#F5C102' : '#E8EFF4'}
          />
        </svg>
      </button>
      <button onClick={() => setRating(5)} style={{borderRadius: 20}}>
        <svg width={40} height={40} fill='none'>
          <path
            d='m20 3.333 5.15 10.434 11.517 1.683-8.334 8.117L30.3 35.033 20 29.617 9.7 35.033l1.967-11.466-8.334-8.117 11.517-1.683L20 3.333Z'
            fill={rating >= 5 ? '#F5C102' : '#E8EFF4'}
          />
        </svg>
      </button>
    </div>
  );
};
