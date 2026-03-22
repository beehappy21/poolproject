import * as React from 'react';
import {SVGProps} from 'react';

type Props = SVGProps<SVGSVGElement>;

export const WishlistTabSvg: React.FC<Props> = ({color = '#F5C102'}) => {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' width={24} height={24} fill='none'>
      <path
        stroke={color}
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={1.5}
        d='M20.84 4.612a5.5 5.5 0 0 0-7.78 0L12 5.672l-1.06-1.06a5.501 5.501 0 1 0-7.78 7.78l1.06 1.06 7.78 7.78 7.78-7.78 1.06-1.06a5.499 5.499 0 0 0 0-7.78v0Z'
      />
    </svg>
  );
};
