import axios from 'axios';
import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {custom} from '../custom';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {components} from '../components';
import {URLS} from '../config';
import {actions} from '../store/actions';
import {hooks} from '../hooks';

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();

  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSignIn = async (): Promise<void> => {
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter your email/member code and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await axios.post(
        URLS.AUTH_LOGIN,
        {
          identifier: identifier.trim(),
          password,
        },
        {
          withCredentials: true,
        },
      );

      const payload = response.data;
      dispatch(
        actions.setUser({
          userId: payload.user?.userId,
          memberCode: payload.user?.memberCode,
          name: payload.user?.name,
          email: payload.user?.email ?? '',
          phone: payload.user?.phone ?? '',
          accessToken: payload.accessToken,
        }),
      );
      dispatch(actions.setRememberMe(rememberMe));
      navigate('/TabNavigator');
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message ||
          'Sign in failed. Check that the API is running and CORS allows http://127.0.0.1:3001.',
      );
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => <components.Header title='Sign in' />;

  const renderContent = (): JSX.Element => (
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
          marginBottom: 14,
        }}
      >
        Welcome back!
      </h1>
      <p
        style={{
          margin: 0,
          color: theme.colors.textColor,
          fontSize: 16,
          lineHeight: 1.6,
          textAlign: 'center',
          marginTop: 0,
          marginBottom: 40,
          ...theme.fonts.Mulish_400Regular,
        }}
      >
        Sign in to continue
      </p>
      <div>
        <custom.InputField
          label='email'
          icon={<svg.InputCheckSvg />}
          containerStyle={{marginBottom: 20}}
          placeholder='email or member code'
          autoComplete='username'
          name='identifier'
          onChange={event => setIdentifier(event.target.value)}
          value={identifier}
        />
        <custom.InputField
          label='password'
          placeholder='••••••••'
          icon={<svg.EyeOffSvg />}
          autoComplete='current-password'
          containerStyle={{marginBottom: 20}}
          name='password'
          onChange={event => setPassword(event.target.value)}
          type='password'
          value={password}
        />
      </div>
      {errorMessage ? (
        <p
          style={{
            margin: '0 0 20px 0',
            color: theme.colors.coralRed,
            fontSize: 14,
            lineHeight: 1.6,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          {errorMessage}
        </p>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 30,
        }}
      >
        {/* Remember me */}
        <div
          style={{
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'row',
            cursor: 'pointer',
            justifyContent: 'space-between',
          }}
          onClick={() => {
            setRememberMe(!rememberMe);
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              border: '2px solid #E8EFF4',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {rememberMe && <svg.InputCheckSvg />}
          </div>
          <span
            style={{
              color: theme.colors.textColor,
              fontSize: 16,
              marginLeft: 12,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            Remember me
          </span>
        </div>
        {/* Forgot password */}
        <button
          onClick={() => navigate('/ForgotPassword')}
          style={{
            color: theme.colors.mainColor,
            fontSize: 16,
            backgroundColor: 'transparent',
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          Forgot password?
        </button>
      </div>
      <components.Button
        title={loading ? 'Signing in...' : 'Sign in'}
        style={{marginBottom: 20}}
        onClick={handleSignIn}
      />
      <div
        style={{display: 'flex', alignItems: 'center', flexDirection: 'row'}}
      >
        <span
          style={{
            marginRight: 4,
            ...theme.fonts.Mulish_400Regular,
            fontSize: 16,
            lineHeight: 1.3,
            color: theme.colors.textColor,
          }}
        >
          Don’t have an account?
        </span>
        <span
          style={{
            ...theme.fonts.Mulish_400Regular,
            fontSize: 16,
            lineHeight: 1.3,
            cursor: 'pointer',
            color: theme.colors.mainColor,
          }}
          onClick={() => navigate('/SignUp')}
        >
          Sign up.
        </span>
      </div>
    </div>
  );

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
