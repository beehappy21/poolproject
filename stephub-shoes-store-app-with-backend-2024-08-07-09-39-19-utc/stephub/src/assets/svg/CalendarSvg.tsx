import * as React from 'react';

export const CalendarSvg: React.FC = () => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={50} height={50} fill='none'>
      <rect width={49} height={49} x={0.5} y={0.5} stroke='#E8EFF4' rx={24.5} />
      <path
        stroke='#60708E'
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.5}
        d='M30.833 18.333H19.167c-.92 0-1.667.746-1.667 1.667v11.667c0 .92.746 1.666 1.667 1.666h11.666c.92 0 1.667-.746 1.667-1.666V20c0-.92-.746-1.667-1.667-1.667ZM28.333 16.667V20M21.667 16.667V20M17.5 23.333h15'
      />
    </svg>
  );
};
