import React from 'react';

import {hooks} from '../../hooks';
import {custom} from '../../custom';
import {components} from '../../components';
import {theme} from '../../constants';
import {svg} from '../../assets/svg';

export const SendPhoneOtp: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderHeader = (): JSX.Element => {
    return <components.Header goBack={true} title='Verify your phone number' />;
  };

  const renderContent = (): JSX.Element => {
    return (
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 20,
          paddingTop: 20,
        }}
      >
        <p
          style={{
            margin: 0,
            ...theme.fonts.Mulish_400Regular,
            fontSize: 16,
            color: theme.colors.textColor,
            marginBottom: 40,
            lineHeight: 1.7,
          }}
        >
          We have sent you an SMS with a code to number: +17 0123456789.
        </p>
        <custom.InputField
          label='phone number'
          icon={<svg.InputCheckSvg />}
          placeholder='enter phone number'
          containerStyle={{marginBottom: 20}}
        />
        <components.Button
          title={'Confirm'}
          onClick={() => {
            navigate('/VerifyPhone');
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
