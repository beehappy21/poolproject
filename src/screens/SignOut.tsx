import React, {useEffect} from 'react';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {components} from '../components';
import {actions} from '../store/actions';

export const SignOut: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const dispatch = hooks.useAppDispatch();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderContent = (): JSX.Element => {
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
          src={require('../assets/icons/07.png')}
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
            textAlign: 'center',
            margin: 0,
            marginBottom: 14,
            textTransform: 'capitalize',
            color: theme.colors.mainColor,
            ...theme.fonts.Mulish_700Bold,
            fontSize: 22,
            fontWeight: 'bold',
          }}
        >
          Are you sure?
        </h2>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.7,
            color: theme.colors.textColor,
            textAlign: 'center',
            whiteSpace: 'pre-line',
            marginBottom: 30,
          }}
        >
          You will need to enter your email and{'\n'}password again.
        </p>
        <components.Button
          title='Cancel'
          onClick={() => {
            navigate(-1);
          }}
          containerStyle={{marginBottom: 10, width: '100%'}}
        />
        <components.Button
          title='Sure'
          onClick={() => {
            dispatch(actions.logOut());
            navigate('/');
          }}
          colorScheme='light'
          containerStyle={{width: '100%'}}
        />
      </div>
    );
  };

  return <>{renderContent()}</>;
};
