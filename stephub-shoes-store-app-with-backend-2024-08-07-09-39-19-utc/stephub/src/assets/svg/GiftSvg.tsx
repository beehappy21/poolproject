import * as React from 'react';

export const GiftSvg: React.FC = () => {
  return (
    <svg width={50} height={50} fill='none'>
      <rect width={49} height={49} x={0.5} y={0.5} stroke='#E8EFF4' rx={24.5} />
      <g
        stroke='#60708E'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.5}
        clipPath='url(#a)'
      >
        <path d='M31.667 25v8.333H18.333V25M33.333 20.833H16.667V25h16.666v-4.167ZM25 33.333v-12.5M25 20.833h-3.75a2.083 2.083 0 1 1 0-4.166c2.917 0 3.75 4.166 3.75 4.166ZM25 20.833h3.75a2.083 2.083 0 0 0 0-4.166c-2.917 0-3.75 4.166-3.75 4.166Z' />
      </g>
      <defs>
        <clipPath id='a'>
          <path fill='#fff' d='M15 15h20v20H15z' />
        </clipPath>
      </defs>
    </svg>
  );
};
