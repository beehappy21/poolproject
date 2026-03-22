import * as React from 'react';

export const DeleteSvg: React.FC = () => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={50} height={50} fill='none'>
      <rect width={49} height={49} x={0.5} y={0.5} stroke='#FF4343' rx={24.5} />
      <path
        stroke='#FF4343'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.5}
        d='m30 20.5-10 10M20 20.5l10 10'
      />
    </svg>
  );
};
