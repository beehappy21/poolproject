import React from 'react';

import {theme} from '../constants';

type Props = {
  style?: React.CSSProperties;
};

export const Line: React.FC<Props> = ({style}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        ...style,
      }}
    >
      <div
        style={{
          width: 3,
          height: 30,
          borderRadius: 10,
          backgroundColor: theme.colors.mainColor,
        }}
      />
    </div>
  );
};
