import {FC} from 'react';

export const EyeOffSvg: FC = () => {
  return (
    <svg width={16} height={16} fill='none'>
      <g stroke='#193364' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M9.413 9.413a2 2 0 1 1-2.826-2.826m5.373 5.373A6.713 6.713 0 0 1 8 13.333C3.333 13.333.667 8 .667 8A12.3 12.3 0 0 1 4.04 4.04l7.92 7.92ZM6.6 2.827a6.08 6.08 0 0 1 1.4-.16C12.667 2.667 15.333 8 15.333 8c-.404.757-.887 1.47-1.44 2.127L6.6 2.827ZM.667.667l14.666 14.666' />
      </g>
      <defs>
        <clipPath id='a'>
          <path fill='#fff' d='M0 0h16v16H0z' />
        </clipPath>
      </defs>
    </svg>
  );
};
