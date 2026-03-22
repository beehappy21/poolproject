import React from 'react';

import {svg} from '../assets/svg';
import {theme} from '../constants';
import {PromocodeType} from '../types';

type Props = {
  isLast: boolean;
  item: PromocodeType;
};

export const PromocodeItem: React.FC<Props> = ({item, isLast}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        borderBottom: '1px solid #E8EFF4',
        paddingBottom: 20,
        marginBottom: isLast ? 0 : 20,
        paddingRight: 20,
        paddingLeft: 20,
        cursor: 'pointer',
      }}
      onClick={() => {
        navigator.clipboard.writeText(item.code);
        alert('Promocode copied to clipboard');
      }}
    >
      <img
        alt='Promocode'
        src={item.image}
        style={{width: 73, height: 84, marginRight: 14, borderRadius: 12}}
        onClick={() => {
          navigator.clipboard.writeText(item.code);
        }}
      />
      <div style={{marginRight: 'auto', overflow: 'hidden', flex: 1}}>
        <h4
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0,
            padding: 0,
            color: theme.colors.mainColor,
          }}
        >
          {item.code}
        </h4>
        <span
          style={{
            display: 'block',
            ...theme.fonts.Mulish_600SemiBold,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: 21,
            lineHeight: 1.7,
            marginBottom: 1,
            marginTop: 1,
            color:
              item.discount <= 15
                ? '#51BA74'
                : item.discount > 15 && item.discount <= 30
                ? '#F5C102'
                : '#FF4343',
          }}
        >
          {item.discount}% off
        </span>
        <span
          style={{
            display: 'block',
            color: theme.colors.textColor,
            ...theme.fonts.Mulish_400Regular,
            lineHeight: 1.5,
            fontSize: 14,
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Valid until {item.expiry}
        </span>
      </div>
      <div style={{marginLeft: 20}}>
        <svg.CopySvg />
      </div>
    </div>
  );
};
