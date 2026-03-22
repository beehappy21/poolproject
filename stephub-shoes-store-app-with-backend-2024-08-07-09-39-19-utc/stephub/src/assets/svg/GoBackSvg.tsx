import * as React from 'react';

export const GoBackSvg: React.FC = () => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={8} height={14} fill='none'>
      <g>
        <path
          stroke='#193364'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M7 13 1 7l6-6'
        />
      </g>
      <defs>
        <path fill='#fff' d='M0 0h8v14H0z' />
      </defs>
    </svg>
  );
};
