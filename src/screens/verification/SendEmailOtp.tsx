import React from 'react';

import {hooks} from '../../hooks';
import {custom} from '../../custom';
import {theme} from '../../constants';
import {components} from '../../components';

export const SendEmailOtp: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderHeader = () => {
    return <components.Header goBack={true} title='Verify your email' />;
  };

  const renderContent = () => {
    return (
      <div style={{padding: '20px 20px 20px 20px'}}>
        <p
          style={{
            margin: 0,
            marginBottom: 40,
            color: theme.colors.textColor,
            lineHeight: 1.7,
            fontSize: 16,
            ...theme.fonts.Mulish_400Regular,
            paddingRight: 20,
          }}
        >
          We have sent you an email with a verification code.
        </p>
        <custom.InputField
          label='email'
          placeholder='enter email'
          containerStyle={{marginBottom: 20}}
        />
        <components.Button
          title={'Confirm'}
          onClick={() => {
            navigate('/VerifyEmail');
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
