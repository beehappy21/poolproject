import * as React from 'react';

type Props = {
  circleColor?: string;
  iconColor?: string;
};

export const MailSvg: React.FC<Props> = ({
  circleColor = '#E8EFF4',
  iconColor = '#60708E',
}) => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={50} height={50} fill='none'>
      <rect
        width={49}
        height={49}
        x={0.5}
        y={0.5}
        stroke={circleColor}
        rx={24.5}
      />
      <path
        stroke={iconColor}
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.5}
        d='M18.333 18.333h13.334c.916 0 1.666.75 1.666 1.667v10c0 .917-.75 1.667-1.666 1.667H18.333c-.916 0-1.666-.75-1.666-1.667V20c0-.917.75-1.667 1.666-1.667Z'
      />
      <path
        stroke={iconColor}
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.5}
        d='M33.333 20 25 25.833 16.667 20'
      />
    </svg>
  );
};
