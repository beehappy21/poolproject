import * as React from 'react';

type Props = {
  fillColor?: string;
  strokeColor?: string;
};

export const HeartSvg: React.FC<Props> = ({
  fillColor,
  strokeColor = '#60708E',
}) => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={20} height={20} fill='none'>
      <path
        fill={fillColor || 'transparent'}
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.2}
        d='M17.367 3.843a4.583 4.583 0 0 0-6.483 0L10 4.727l-.883-.884a4.584 4.584 0 1 0-6.483 6.483l.883.884L10 17.693l6.484-6.483.883-.884a4.584 4.584 0 0 0 0-6.483v0Z'
      />
    </svg>
  );
};
