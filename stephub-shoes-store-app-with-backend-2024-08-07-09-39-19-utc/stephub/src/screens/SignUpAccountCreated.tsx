import React from 'react';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {components} from '../components';

export const SignUpAccountCreated: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderContent = (): JSX.Element => {
    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <img
          src={require('../assets/icons/08.png')}
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
          Account Created!
        </h2>
        <p
          style={{
            margin: '0 20px',
            textAlign: 'center',
            color: theme.colors.textColor,
            lineHeight: 1.7,
            marginBottom: 30,
          }}
        >
          Your account had beed created successfully.
        </p>
        <components.Button
          title='shop now'
          onClick={() => {
            navigate('/TabNavigator');
          }}
        />
      </div>
    );
  };

  return renderContent();
};
