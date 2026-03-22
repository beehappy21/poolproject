import React, {useEffect} from 'react';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {actions} from '../store/actions';
import {components} from '../components';

export const OrderFailed: React.FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderContent = () => {
    return (
      <div
        style={{
          height: '100vh',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <img
          src={require('../assets/icons/12.png')}
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
            color: theme.colors.mainColor,
            textTransform: 'capitalize',
            marginBottom: 14,
            ...theme.fonts.Mulish_700Bold,
            fontSize: 22,
            fontWeight: 'bold',
            lineHeight: 1.2,
          }}
        >
          Sorry, your order could not be completed.
        </h2>
        <p
          style={{
            color: theme.colors.textColor,
            textAlign: 'center',
            lineHeight: 1.7,
            ...theme.fonts.Mulish_400Regular,
            whiteSpace: 'pre-line',
            margin: 0,
            marginBottom: 30,
          }}
        >
          Something went wrong.{'\n'}Please try again to continue your order.
        </p>
        <components.Button
          title='Try Again'
          onClick={() => {
            dispatch(actions.setScreen('Order'));
            navigate('/TabNavigator');
          }}
          containerStyle={{width: '100%', marginBottom: 10}}
        />
        <components.Button
          title='Go to My Profile'
          onClick={() => {
            dispatch(actions.setScreen('Profile'));
            navigate('/TabNavigator');
          }}
          colorScheme='light'
          containerStyle={{width: '100%'}}
        />
      </div>
    );
  };

  return renderContent();
};
