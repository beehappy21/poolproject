import React from 'react';

import {svg} from '../assets/svg';
import {theme} from '../constants';

type Props = {
  title: string;
  icon?: JSX.Element;
  onClick?: () => void;
  emailVerify?: boolean;
  titleStyle?: any;
  goNavigation?: boolean;
  containerStyle?: any;
  navIcon?: boolean;
};

export const ProfileItem: React.FC<Props> = ({
  titleStyle,
  title,
  icon,
  onClick,
  navIcon = true,
}) => {
  return (
    <button
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        padding: '10px 20px',
        backgroundColor: theme.colors.transparent,
        borderTop: `1px solid ${theme.colors.aliceBlue2}`,
      }}
      onClick={onClick}
    >
      {icon}
      <h5
        style={{
          color: theme.colors.mainColor,
          marginLeft: 14,
          ...theme.fonts.Mulish_600SemiBold,
          fontSize: 16,
          ...titleStyle,
        }}
      >
        {title}
      </h5>
      {onClick && navIcon && (
        <div style={{marginLeft: 'auto'}}>
          <svg.RightArrowSvg />
        </div>
      )}
    </button>
  );
};
