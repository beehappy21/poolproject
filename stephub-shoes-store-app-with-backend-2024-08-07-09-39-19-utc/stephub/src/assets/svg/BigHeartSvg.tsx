import * as React from 'react';

type Props = {
  fillColor?: string;
  strokeColor?: string;
};

export const BigHeartSvg: React.FC<Props> = ({
  fillColor = 'transparent',
  strokeColor = '#60708E',
}) => {
  return (
    <svg width={44} height={44} fill='none'>
      <rect width={43} height={43} x={0.5} y={0.5} stroke='#E8EFF4' rx={21.5} />
      <path
        fill={fillColor}
        stroke={strokeColor}
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.2}
        d='M29.367 15.841a4.584 4.584 0 0 0-6.483 0l-.884.884-.883-.884a4.584 4.584 0 0 0-6.483 6.484l.883.883L22 29.69l6.484-6.483.883-.883a4.585 4.585 0 0 0 0-6.484v0Z'
      />
    </svg>
  );
};
