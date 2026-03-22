import * as React from 'react';

export const UserSvg: React.FC = () => {
  return (
    <svg width={50} height={50} fill='none'>
      <rect width={49} height={49} x={0.5} y={0.5} stroke='#E8EFF4' rx={24.5} />
      <path
        stroke='#60708E'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.5}
        d='M31.667 32v-1.667A3.333 3.333 0 0 0 28.333 27h-6.666a3.333 3.333 0 0 0-3.334 3.333V32M25 23.667A3.333 3.333 0 1 0 25 17a3.333 3.333 0 0 0 0 6.667Z'
      />
    </svg>
  );
};
