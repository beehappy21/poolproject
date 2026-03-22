import React from 'react';
import PuffLoader from 'react-spinners/PuffLoader';

import {theme} from '../constants';

export const TabLoader: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        position: 'absolute',
        inset: 0,
        top: 52,
        bottom: 64,
      }}
    >
      <PuffLoader
        size={40}
        color={'#455A81'}
        aria-label='Loading Spinner'
        data-testid='loader'
        speedMultiplier={1}
      />
    </div>
  );
};
