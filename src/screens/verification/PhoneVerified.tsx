import React from 'react';

import {hooks} from '../../hooks';
import {theme} from '../../constants';
import {components} from '../../components';

export const PhoneVerified: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderContent = (): JSX.Element => {
    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <img
          src={require('../../assets/icons/13.png')}
          alt='order successful'
          style={{
            width: 225.18,
            display: 'block',
            margin: '0 auto',
            marginBottom: 4,
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
          Your phone number has been{'\n'}successfully verified!
        </h2>
        <p
          style={{
            margin: 0,
            whiteSpace: 'pre-line',
            textAlign: 'center',
            color: theme.colors.textColor,
            padding: '0 20px',
            lineHeight: 1.7,
            marginBottom: 30,
          }}
        >
          Now you can enjoy all the features of our app. Thank you for choosing.
        </p>
        <components.Button
          title='Done'
          onClick={() => {
            navigate('/TabNavigator');
          }}
          containerStyle={{marginBottom: 10}}
        />
      </div>
    );
  };

  return renderContent();
};
