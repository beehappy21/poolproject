import React from 'react';

import {svg} from '../assets/svg';
import {theme} from '../constants';

type Props = {
  title: string;
  viewAllVisible?: boolean;
  viewAllOnClick?: () => void;
  containerStyle?: any;
};

export const BlockHeading: React.FC<Props> = ({
  title,
  viewAllOnClick,
  containerStyle,
  viewAllVisible = true,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.flex.rowCenterSpaceBetween,
        ...containerStyle,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 20,
          ...theme.fonts.Mulish_700Bold,
          color: theme.colors.mainColor,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>
      {viewAllVisible && (
        <button onClick={viewAllOnClick} style={{lineHeight: 0}}>
          <svg.ViewAllSvg />
        </button>
      )}
    </div>
  );
};
