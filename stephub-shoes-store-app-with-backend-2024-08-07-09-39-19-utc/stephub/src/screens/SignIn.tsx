import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {custom} from '../custom';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {components} from '../components';
import {URLS} from '../config';
import {actions} from '../store/actions';
import {hooks} from '../hooks';
import {
  buildLineLiffLaunchUrl,
  buildSignUpPath,
  extractSponsorCodeFromSearch,
  getLineConfig,
  initializeLineLiff,
  isLineUserAgent,
} from '../utils/line';

const LOCAL_AUTH_BYPASS = false;
const DEV_IMPERSONATION_PASSWORD = 'a1a1a1';
const SIGN_IN_MAX_ATTEMPTS = 3;

type SignInLocationState = {
  returnTo?: string;
  tabScreen?: 'Home' | 'Search' | 'Order' | 'Wishlist' | 'Profile';
  loginMessage?: string;
};

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => window.setTimeout(resolve, ms));

const shouldRetrySignIn = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  if (error.code === 'ERR_NETWORK') {
    return true;
  }

  const status = error.response?.status;
  return status === 502 || status === 503 || status === 504;
};
const isLocalRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local')
  );
};

const normalizeIdentifier = (value: string): string => {
  const trimmed = value.trim();

  if (/^[a-z]{2}\d+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed;
};

const applySignedInSession = ({
  payload,
  dispatch,
  rememberMe,
  navigate,
  memberCodeFallback,
  nameFallback,
  lineUserId,
  lineDisplayName,
  linePictureUrl,
  returnTo,
  tabScreen,
}: {
  payload: any;
  dispatch: ReturnType<typeof hooks.useAppDispatch>;
  rememberMe: boolean;
  navigate: ReturnType<typeof useNavigate>;
  memberCodeFallback?: string;
  nameFallback?: string;
  lineUserId?: string;
  lineIdToken?: string;
  lineDisplayName?: string;
  linePictureUrl?: string;
  returnTo?: string;
  tabScreen?: 'Home' | 'Search' | 'Order' | 'Wishlist' | 'Profile';
}) => {
  dispatch(
    actions.setUser({
      userId: payload.user?.userId,
      memberCode: payload.user?.memberCode ?? memberCodeFallback,
      name: payload.user?.name ?? nameFallback,
      lineUserId: lineUserId || payload.lineBinding?.lineUserId || undefined,
      lineDisplayName:
        lineDisplayName || payload.lineBinding?.displayName || undefined,
      linePictureUrl:
        linePictureUrl || payload.lineBinding?.pictureUrl || undefined,
      email: payload.user?.email ?? '',
      phone: payload.user?.phone ?? '',
      accessToken: payload.accessToken,
    }),
  );
  dispatch(actions.setRememberMe(rememberMe));

  if (tabScreen) {
    dispatch(actions.setScreen(tabScreen));
  }

  navigate(returnTo || '/TabNavigator');
};

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = hooks.useAppDispatch();
  const navigationState = (location.state || {}) as SignInLocationState;

  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lineReady, setLineReady] = useState<boolean>(false);
  const [lineLoggedIn, setLineLoggedIn] = useState<boolean>(false);
  const [lineInClient, setLineInClient] = useState<boolean>(false);
  const [lineUserId, setLineUserId] = useState<string>('');
  const [lineIdToken, setLineIdToken] = useState<string>('');
  const [lineDisplayName, setLineDisplayName] = useState<string>('');
  const [linePictureUrl, setLinePictureUrl] = useState<string>('');
  const showDevImpersonationHint = isLocalRuntime();
  const sponsorCode = useMemo(
    () => extractSponsorCodeFromSearch(location.search),
    [location.search],
  );
  const lineConfig = useMemo(() => getLineConfig(), []);
  const lineEntryButtonLabel = lineLoggedIn
    ? sponsorCode
      ? 'สมัครต่อด้วย LINE'
      : 'เข้าสู่ระบบด้วย LINE'
    : sponsorCode
      ? 'เปิด LINE เพื่อสมัคร'
      : 'เปิด LINE เพื่อเข้าสู่ระบบ';
  useEffect(() => {
    if (navigationState.loginMessage) {
      setErrorMessage(navigationState.loginMessage);
    }
  }, [navigationState.loginMessage]);

  const submitSignIn = async (
    normalizedIdentifier: string,
  ) => {
    let attempt = 0;

    while (attempt < SIGN_IN_MAX_ATTEMPTS) {
      try {
        return await axios.post(
          URLS.AUTH_LOGIN,
          {
            identifier: normalizedIdentifier,
            password,
          },
          {
            withCredentials: true,
          },
        );
      } catch (error) {
        attempt += 1;

        if (!shouldRetrySignIn(error) || attempt >= SIGN_IN_MAX_ATTEMPTS) {
          throw error;
        }

        await delay(500 * attempt);
      }
    }

    throw new Error('Sign-in request exhausted retries.');
  };
  useEffect(() => {
    let mounted = true;

    const bootstrapLine = async () => {
      const result = await initializeLineLiff();

      if (!mounted) {
        return;
      }

      setLineReady(result.isReady);
      setLineLoggedIn(result.isLoggedIn);
      setLineInClient(result.isInClient);
      setLineUserId(result.profile?.userId || '');
      setLineIdToken(result.profile?.idToken || '');
      setLineDisplayName(result.profile?.displayName || '');
      setLinePictureUrl(result.profile?.pictureUrl || '');

      if (result.errorMessage) {
        return;
      }

      void result.profile?.displayName;
    };

    bootstrapLine().catch(error => {
      if (mounted) {
        console.error('LIFF bootstrap failed.', error);
      }
    });

    return () => {
      mounted = false;
    };
  }, [lineConfig.isConfigured]);

  const handleSignIn = async (): Promise<void> => {
    const normalizedIdentifier = normalizeIdentifier(identifier);

    if (LOCAL_AUTH_BYPASS) {
      dispatch(
        actions.setUser({
          userId: 'local-bypass-user',
          memberCode: normalizedIdentifier || 'THLOCAL001',
          name: 'Stephub Local User',
          email: 'local-bypass@stephub.test',
          phone: '0999999999',
          accessToken: 'local-bypass-token',
        }),
      );
      dispatch(actions.setRememberMe(true));
      navigate('/TabNavigator');
      return;
    }

    if (!normalizedIdentifier || !password.trim()) {
      setErrorMessage('Please enter your email/member code and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const response = await submitSignIn(normalizedIdentifier);

      const payload = response.data;

      try {
        if (lineLoggedIn && lineUserId) {
          await axios.post(
            URLS.AUTH_LINE_BINDING,
            {
              lineUserId,
              lineIdToken: lineIdToken || undefined,
              displayName: lineDisplayName || undefined,
              pictureUrl: linePictureUrl || undefined,
              source: sponsorCode ? 'line_invite_signin' : 'line_signin',
            },
            {
              headers: {
                Authorization: `Bearer ${payload.accessToken}`,
              },
            },
          );
        }

        applySignedInSession({
          payload,
          dispatch,
          rememberMe,
          navigate,
          memberCodeFallback: normalizedIdentifier,
          nameFallback: normalizedIdentifier,
          lineUserId: lineLoggedIn ? lineUserId || undefined : undefined,
          lineIdToken: lineLoggedIn ? lineIdToken || undefined : undefined,
          lineDisplayName: lineDisplayName || undefined,
          linePictureUrl: linePictureUrl || undefined,
          returnTo: navigationState.returnTo,
          tabScreen: navigationState.tabScreen,
        });
      } catch (clientError) {
        console.error('Sign in succeeded but client navigation failed.', clientError);
        setErrorMessage(
          'Signed in successfully, but the app could not open the next screen. Please refresh and try again.',
        );
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const serverMessage = error.response?.data?.message;

        if (serverMessage) {
          setErrorMessage(serverMessage);
        } else if (error.code === 'ERR_NETWORK') {
          setErrorMessage(
            `Unable to reach the sign-in service at ${URLS.API_BASE_URL} after multiple attempts. Please check your connection and try again.`,
          );
        } else {
          setErrorMessage('Sign in failed. Please verify your member code/email and password, then try again.');
        }

        console.error('Sign in request failed.', {
          code: error.code,
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.error('Unexpected sign in failure.', error);
        setErrorMessage('An unexpected sign-in error occurred. Please refresh and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLineEntry = (): void => {
    const entryUrl = buildLineLiffLaunchUrl({
      sponsorCode,
      mode: sponsorCode ? 'signup' : 'signin',
      returnTo: sponsorCode ? buildSignUpPath(sponsorCode) : '/TabNavigator',
    });

    if (!entryUrl) {
      setErrorMessage(
        'ยังไม่ได้ตั้งค่า LINE LIFF sign-in URL กรุณาตรวจสอบ REACT_APP_LINE_LIFF_ID และ REACT_APP_LINE_LIFF_SIGNIN_URL',
      );
      return;
    }

    window.location.assign(entryUrl);
  };

  const renderHeader = () => (
    <components.Header title='Sign in' hideSearch={true} />
  );

  const renderContent = (): JSX.Element => (
    <div style={{padding: '10px 20px 20px 20px'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 204,
            maxWidth: '72vw',
            height: 156,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src='/5.png'
            alt='Blife Healthy'
            style={{
              display: 'block',
              width: '124%',
              maxWidth: 'none',
              height: '124%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
        </div>
      </div>
      <p
        style={{
          margin: 0,
          color: theme.colors.textColor,
          fontSize: 16,
          lineHeight: 1.28,
          textAlign: 'center',
          marginTop: 0,
          marginBottom: 22,
          ...theme.fonts.Mulish_400Regular,
        }}
      >
        Sign in to continue
      </p>
      {sponsorCode ? (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: 12,
            backgroundColor: '#F0FDF4',
            color: '#166534',
            fontSize: 14,
            lineHeight: 1.6,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          ลิงก์นี้ผูกกับผู้แนะนำ <strong>{sponsorCode}</strong> แล้ว
          หากยังไม่มีบัญชี ให้กด Sign up เพื่อสมัครจาก invite นี้ได้เลย
        </div>
      ) : null}
      {LOCAL_AUTH_BYPASS ? (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: 12,
            backgroundColor: '#FFF4D6',
            color: theme.colors.mainColor,
            fontSize: 14,
            lineHeight: 1.6,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          Local bypass is enabled for UI review. Tap Sign in to continue
          without calling the API.
        </div>
      ) : showDevImpersonationHint ? (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 14px',
            borderRadius: 12,
            backgroundColor: '#EEF5FF',
            color: theme.colors.mainColor,
            fontSize: 14,
            lineHeight: 1.6,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          Local dev impersonation is enabled. Use a member code with password{' '}
          <strong>{DEV_IMPERSONATION_PASSWORD}</strong> to sign in as that member
          on local/dev. Use a `member003` member such as `TH0000001`, or use
          the member&apos;s real password as usual.
        </div>
      ) : null}
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
      {(lineConfig.liffId || lineConfig.oaUrl || isLineUserAgent()) && (
        <button
          onClick={handleLineEntry}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: 14,
            border: '1px solid #C7E8CF',
            backgroundColor: '#06C755',
            color: '#FFFFFF',
            fontSize: 16,
            marginBottom: 16,
            boxShadow: lineInClient || lineReady ? '0 14px 30px rgba(6, 199, 85, 0.22)' : 'none',
          }}
        >
          {lineEntryButtonLabel}
        </button>
      )}
      <div
        style={{
          marginBottom: 20,
          color: '#64748B',
          fontSize: 12,
          lineHeight: 1.7,
          ...theme.fonts.Mulish_400Regular,
        }}
      >
        สมาชิกเก่าที่ยังไม่เคยผูก LINE ให้ใช้ Sign in ปกติก่อนหนึ่งครั้ง จากนั้นไปที่ Profile เพื่อกดเชื่อม LINE
      </div>
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
          onClick={() => navigate(buildSignUpPath(sponsorCode))}
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
