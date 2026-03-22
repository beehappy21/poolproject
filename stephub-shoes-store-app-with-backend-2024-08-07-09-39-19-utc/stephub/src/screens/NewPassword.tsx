import {FC} from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {svg} from '../assets/svg';
import {components} from '../components';
import {theme} from '../constants';

export const NewPassword: FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderHeader = () => {
    return <components.Header title='Reset password' goBack={true} />;
  };

  const renderContent = () => {
    return (
      <div style={{padding: '30px 20px 20px 20px'}}>
        <p
          style={{
            margin: 0,
            marginBottom: 40,
            color: theme.colors.textColor,
          }}
        >
          Enter new password and confirm.
        </p>
        <custom.InputField
          clickable={true}
          label='password'
          placeholder='••••••••'
          type='password'
          icon={<svg.EyeOffSvg />}
          containerStyle={{marginBottom: 20}}
        />
        <custom.InputField
          clickable={true}
          type='password'
          label='confirm password'
          placeholder='••••••••'
          icon={<svg.EyeOffSvg />}
          containerStyle={{marginBottom: 20}}
        />
        <components.Button
          title='change password'
          onClick={() => {
            navigate('/ForgotPasswordSentEmail');
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
