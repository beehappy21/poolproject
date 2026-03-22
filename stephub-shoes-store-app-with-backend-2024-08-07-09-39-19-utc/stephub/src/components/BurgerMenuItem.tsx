import React from 'react';

import {theme} from '../constants';

type Props = {
  icon: JSX.Element;
  titleLine1: string;
  titleLine2: string;
};

export const BurgerMenuItem: React.FC<Props> = ({
  titleLine1,
  titleLine2,
  icon,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        borderBottomWidth: 1,
        paddingLeft: 20,
        paddingRight: 20,
        flexDirection: 'row',
        marginBottom: 20,
        paddingBottom: 26,
        borderBottomColor: `${theme.colors.lavenderMist}20`,
        borderBottomStyle: 'solid',
      }}
    >
      {icon}
      <div style={{marginLeft: 8}}>
        <div
          style={{
            color: theme.colors.white,
            fontSize: 14,
            lineHeight: 1.5,
            ...theme.fonts.Mulish_400Regular,
            textAlign: 'left',
          }}
        >
          {titleLine1}
        </div>
        <div
          style={{
            color: theme.colors.white,
            fontSize: 14,
            lineHeight: 1.5,
            ...theme.fonts.Mulish_400Regular,
            textAlign: 'left',
          }}
        >
          {titleLine2}
        </div>
      </div>
    </div>
  );
};
