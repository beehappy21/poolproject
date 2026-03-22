import {FC} from 'react';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {components} from '../components';

export const ForgotPasswordSentEmail: FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderContent = (): JSX.Element => {
    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <img
          src={require('../assets/icons/09.png')}
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
            whiteSpace: 'pre-line',
            textTransform: 'capitalize',
          }}
        >
          Your password has{'\n'}been reset!
        </h2>
        <p
          style={{
            whiteSpace: 'pre-line',
            textAlign: 'center',
            color: theme.colors.textColor,
            ...theme.fonts.Mulish_400Regular,
            lineHeight: 1.7,
            fontSize: 16,
            marginBottom: 30,
          }}
        >
          Log in with your new credentials.{'\n'}Welcome back!
        </p>
        <components.Button
          title='done'
          onClick={() => {
            navigate('/');
          }}
        />
      </div>
    );
  };

  return renderContent();
};
