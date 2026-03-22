import React, {CSSProperties, MouseEventHandler} from 'react';

import {theme} from '../constants';

interface ButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  title: string;
  style?: CSSProperties;
  containerStyle?: CSSProperties;
  colorScheme?: 'light' | 'dark';
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  title,
  style,
  colorScheme = 'dark',
  containerStyle,
}) => {
  return (
    <div style={{...containerStyle}}>
      <button
        style={{
          width: '100%',
          border: 'none',
          backgroundColor:
            colorScheme === 'dark' ? theme.colors.mainColor : '#F2F7FC',
          color:
            colorScheme === 'dark'
              ? theme.colors.mainYellow
              : theme.colors.mainColor,
          height: 50,
          textAlign: 'center',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: 14,
          cursor: 'pointer',
          margin: 0,
          padding: 0,
          transition: 'opacity 0.3s ease',
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
          textTransform: 'capitalize',
          ...theme.fonts.Mulish_900Black,
          ...style,
        }}
        onClick={onClick}
      >
        {title}
      </button>
    </div>
  );
};
