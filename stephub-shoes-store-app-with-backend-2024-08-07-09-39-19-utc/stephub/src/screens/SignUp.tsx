import {FC} from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {components} from '../components';

const renderHeader = (): JSX.Element => {
  return <components.Header goBack={true} />;
};

export const SignUp: FC = (): JSX.Element => {
  const navigate = hooks.useAppNavigate();

  const renderContent = (): JSX.Element => {
    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <components.Line style={{marginBottom: 14}} />
        <h1
          style={{
            margin: 0,
            textAlign: 'center',
            ...theme.fonts.Mulish_700Bold,
            color: theme.colors.mainColor,
            fontSize: 32,
            lineHeight: 1.2,
            textTransform: 'capitalize',
            marginBottom: 40,
          }}
        >
          Sign up
        </h1>
        <custom.InputField
          label='name'
          placeholder='Zenith Sneaks'
          icon={<svg.InputCheckSvg />}
          containerStyle={{marginBottom: 20}}
        />
        <custom.InputField
          label='Email'
          icon={<svg.InputCheckSvg />}
          placeholder='zenithsneaks@mail.com'
          containerStyle={{marginBottom: 20}}
        />
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
          title='Sign up'
          onClick={() => {
            navigate('/SignUpAccountCreated');
          }}
          style={{marginBottom: 20}}
        />
        <div
          style={{flexDirection: 'row', display: 'flex', alignItems: 'center'}}
        >
          <span
            style={{
              marginRight: 4,
              ...theme.fonts.Mulish_400Regular,
              color: theme.colors.textColor,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            Already have an account?
          </span>
          <span
            style={{
              ...theme.fonts.Mulish_400Regular,
              color: theme.colors.mainColor,
              fontSize: 16,
              lineHeight: 1.7,
            }}
            onClick={() => {
              navigate('/');
            }}
          >
            Sign in.
          </span>
        </div>
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
