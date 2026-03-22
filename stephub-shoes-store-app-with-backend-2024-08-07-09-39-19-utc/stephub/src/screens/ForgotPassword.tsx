import React from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {components} from '../components';

export const ForgotPassword: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderHeader = () => {
    return <components.Header title='Forgot password' goBack={true} />;
  };

  const renderContent = () => {
    return (
      <div style={{padding: '30px 20px 20px 20px'}}>
        <p
          style={{
            margin: 0,
            marginBottom: 40,
            color: theme.colors.textColor,
            lineHeight: 1.7,
            marginRight: 20,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          Please enter your email address. You will receive an OTP code.
        </p>
        <custom.InputField
          label='Email'
          icon={<svg.InputCheckSvg />}
          placeholder='zenithsneaks@mail.com'
          containerStyle={{marginBottom: 20}}
        />
        <components.Button
          title='send'
          onClick={() => {
            navigate('/NewPassword');
          }}
        />
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
