import {FC} from 'react';

import {hooks} from '../../hooks';
import {theme} from '../../constants';
import {components} from '../../components';
import {actions} from '../../store/actions';

export const VerifyEmail: FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const inputs = ['', '', '', '', ''];

  const renderHeader = (): JSX.Element => {
    return <components.Header goBack={true} title='Verification' />;
  };

  const renderDescription = (): JSX.Element => {
    return (
      <p
        style={{
          margin: 0,
          marginBottom: 30,
          ...theme.fonts.Mulish_400Regular,
          color: theme.colors.textColor,
          lineHeight: 1.7,
          fontSize: 16,
          paddingRight: 20,
        }}
      >
        Enter your OTP code here.
      </p>
    );
  };

  const renderInputFields = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 30,
        }}
      >
        {inputs.map((input, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              width: '17%',
              aspectRatio: 1 / 1,
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 600 / 2,
              backgroundColor: theme.colors.imageBackground,
            }}
          >
            <input
              maxLength={1}
              style={{
                textAlign: 'center',
                width: '100%',
                height: '100%',
                ...theme.fonts.Mulish_400Regular,
                borderRadius: 600 / 2,
                border: 'none',
                backgroundColor: theme.colors.transparent,
                fontSize: 20,
                color: theme.colors.mainColor,
              }}
              type='number'
              min={0}
              max={9}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderIfDidNotReceiveCode = (): JSX.Element => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 30,
        }}
      >
        <p
          style={{
            marginRight: 5,
            ...theme.fonts.Mulish_400Regular,
            fontSize: 16,
            color: theme.colors.textColor,
          }}
        >
          Didn’t receive the OTP?{' '}
          <button
            style={{
              marginRight: 5,
              ...theme.fonts.Mulish_400Regular,
              fontSize: 16,
              color: theme.colors.mainColor,
            }}
          >
            Resend.
          </button>
        </p>
      </div>
    );
  };

  const renderButton = (): JSX.Element => {
    return (
      <components.Button
        title='verify'
        onClick={() => {
          dispatch(actions.setEmailVerified(true));
          dispatch(actions.setScreen('Profile'));
          navigate('/EmailVerified');
        }}
        containerStyle={{marginBottom: 20}}
      />
    );
  };

  const renderContent = (): JSX.Element => {
    return (
      <div style={{flexGrow: 1, padding: 20}}>
        {renderDescription()}
        {renderInputFields()}
        {renderIfDidNotReceiveCode()}
        {renderButton()}
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
