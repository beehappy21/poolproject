import {FC} from 'react';

export const InputCheckSvg: FC = () => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={12} height={12} fill='none'>
      <g clipPath='url(#a)'>
        <path
          stroke='#193364'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={0.925}
          d='m10.05 2.962-5.569 5.57L1.949 6'
        />
      </g>
      <defs>
        <clipPath id='a'>
          <path fill='#fff' d='M.683 2.202h10.633v7.595H.683z' />
        </clipPath>
      </defs>
    </svg>
  );
};
