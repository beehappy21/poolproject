import * as React from 'react';

export const BurgerSvg: React.FC = () => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={25} height={12} fill='none'>
      <g stroke='#193364' strokeLinecap='round' strokeWidth={2}>
        <path d='M1 1h18M1 6h23M1 11h18' />
      </g>
      <defs>
        <path fill='#fff' d='M0 0h25v12H0z' />
      </defs>
    </svg>
  );
};
