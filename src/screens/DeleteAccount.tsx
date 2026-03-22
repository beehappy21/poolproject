import React from 'react';

import {hooks} from '../hooks';
import {components} from '../components';
import {theme} from '../constants';

export const DeleteAccount: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderContent = (): JSX.Element => {
    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <img
          src={require('../assets/icons/10.png')}
          alt='order successful'
          style={{
            width: 225.18,
            display: 'block',
            margin: '0 auto',
            marginBottom: 14,
          }}
        />
        <h2
          style={{
            margin: 0,
            textAlign: 'center',
            ...theme.fonts.Mulish_700Bold,
            fontSize: 22,
            lineHeight: 1.2,
            color: theme.colors.mainColor,
            marginBottom: 14,
            textTransform: 'capitalize',
            whiteSpace: 'pre-line',
          }}
        >
          Are you sure?
        </h2>
        <p
          style={{
            margin: '0 20px',
            textAlign: 'center',
            color: theme.colors.textColor,
            lineHeight: 1.7,
            marginBottom: 30,
            whiteSpace: 'pre-line',
          }}
        >
          This action is irreversible.{'\n'}All your data will be lost.
        </p>
        <components.Button
          title='Cancel'
          onClick={() => {
            navigate(-1);
          }}
          containerStyle={{marginBottom: 10}}
        />
        <components.Button
          title='Sure'
          onClick={() => {
            navigate('/');
          }}
          colorScheme='light'
        />
      </div>
    );
  };

  return <>{renderContent()}</>;
};
