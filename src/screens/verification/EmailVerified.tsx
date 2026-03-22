import React from 'react';

import {hooks} from '../../hooks';
import {components} from '../../components';
import {theme} from '../../constants';

export const EmailVerified: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderContent = () => {
    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <img
          src={require('../../assets/icons/17.png')}
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
          Your email has been{'\n'}successfully verified!
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
          Now that you're officially a part of our{'\n'}community, you can enjoy
          all the features of our app.
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
