import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {components} from '../components';
import {theme} from '../constants';
import {URLS} from '../config';
import {hooks} from '../hooks';
import {actions} from '../store/actions';
import {
  buildLineLoginCallbackUrl,
  buildSignUpPath,
  extractSponsorCodeFromSearch,
  getLineConfig,
  initializeLineLiff,
  normalizeSponsorCode,
  resolveSafeReturnTo,
  type LineEntryMode,
} from '../utils/line';

type LineLoginResponse = {
  accessToken: string;
  user?: {
    userId?: string;
    memberCode?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  lineBinding?: {
    lineUserId?: string;
    displayName?: string | null;
    pictureUrl?: string | null;
  } | null;
};

type StepTone = 'neutral' | 'success' | 'warning' | 'danger';

const parseMode = (rawValue?: string | null): LineEntryMode => {
  if (rawValue === 'signup' || rawValue === 'connect') {
    return rawValue;
  }

  return 'signin';
};

const getStepColor = (tone: StepTone): string => {
  switch (tone) {
    case 'success':
      return '#166534';
    case 'warning':
      return '#92400E';
    case 'danger':
      return theme.colors.coralRed;
    default:
      return theme.colors.textColor;
  }
};

export const LineLiffSignIn: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();

  const lineConfig = useMemo(() => getLineConfig(), []);
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sponsorCode = useMemo(
    () => normalizeSponsorCode(query.get('sponsorCode') || extractSponsorCodeFromSearch(location.search)),
    [location.search, query],
  );
  const mode = useMemo(() => parseMode(query.get('mode')), [query]);
  const returnTo = useMemo(
    () =>
      resolveSafeReturnTo(
        query.get('returnTo'),
        mode === 'signup' || sponsorCode ? buildSignUpPath(sponsorCode) : '/TabNavigator',
      ),
    [mode, query, sponsorCode],
  );

  const [loading, setLoading] = useState(true);
  const [statusTone, setStatusTone] = useState<StepTone>('neutral');
  const [statusTitle, setStatusTitle] = useState('Preparing LINE sign in');
  const [statusDetail, setStatusDetail] = useState(
    'We are checking the LIFF session and will guide the member to the right next step.',
  );

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (!lineConfig.liffId) {
        if (!mounted) {
          return;
        }

        setLoading(false);
        setStatusTone('danger');
        setStatusTitle('LINE LIFF is not configured');
        setStatusDetail(
          'The public LIFF ID is still missing on this build. Use normal sign in for now and ask the operator to add the LINE web env values before retrying.',
        );
        return;
      }

      const bootstrap = await initializeLineLiff();

      if (!mounted) {
        return;
      }

      if (bootstrap.errorMessage && !bootstrap.isReady) {
        setLoading(false);
        setStatusTone('warning');
        setStatusTitle('Unable to initialize LINE right now');
        setStatusDetail(
          `${bootstrap.errorMessage} Use normal sign in if you already have a member code, or reopen the invite link inside LINE and try again.`,
        );
        return;
      }

      if (!bootstrap.isLoggedIn) {
        setStatusTone('neutral');
        setStatusTitle('Redirecting to LINE login');
        setStatusDetail(
          'We need the LINE session first. After LINE login, the member will return here automatically.',
        );

        const liff = (window as Window & {
          liff?: {login(input?: {redirectUri?: string}): void};
        }).liff;

        if (!liff) {
          setLoading(false);
          setStatusTone('danger');
          setStatusTitle('LIFF SDK is unavailable');
          setStatusDetail(
            'This page did not receive the LINE SDK. Use normal sign in as a fallback, then try the LINE button again from a supported browser.',
          );
          return;
        }

        liff.login({
          redirectUri: buildLineLoginCallbackUrl({
            sponsorCode,
            mode,
            returnTo,
          }),
        });
        return;
      }

      const profile = bootstrap.profile;

      if (!profile?.userId) {
        setLoading(false);
        setStatusTone('warning');
        setStatusTitle('LINE profile is still missing');
        setStatusDetail(
          'LINE login succeeded but the LIFF profile is not ready yet. Please retry in LINE, or use normal sign in and connect LINE later from Profile.',
        );
        return;
      }

      if (mode === 'signup' && sponsorCode) {
        navigate(buildSignUpPath(sponsorCode), {
          replace: true,
          state: {sponsorCode},
        });
        return;
      }

      setStatusTone('neutral');
      setStatusTitle('Signing in with LINE');
      setStatusDetail(
        'The member account is being matched from the current LINE binding before opening the app.',
      );

      try {
        const response = await axios.post<LineLoginResponse>(
          URLS.AUTH_LINE_LOGIN,
          {
            lineUserId: profile.userId,
            lineIdToken: profile.idToken || undefined,
          },
          {
            withCredentials: true,
          },
        );

        dispatch(
          actions.setUser({
            userId: response.data.user?.userId,
            memberCode: response.data.user?.memberCode,
            name: response.data.user?.name || profile.displayName,
            lineUserId: profile.userId,
            lineDisplayName:
              response.data.lineBinding?.displayName || profile.displayName,
            linePictureUrl:
              response.data.lineBinding?.pictureUrl || profile.pictureUrl || undefined,
            email: response.data.user?.email ?? '',
            phone: response.data.user?.phone ?? '',
            accessToken: response.data.accessToken,
          }),
        );
        dispatch(actions.setRememberMe(true));

        navigate(returnTo, {replace: true});
      } catch (error: unknown) {
        if (!mounted) {
          return;
        }

        setLoading(false);

        if (axios.isAxiosError(error)) {
          const serverMessage = error.response?.data?.message || '';

          if (
            mode === 'signup' &&
            sponsorCode &&
            error.response?.status === 401
          ) {
            navigate(buildSignUpPath(sponsorCode), {
              replace: true,
              state: {sponsorCode},
            });
            return;
          }

          if (error.response?.status === 401) {
            setStatusTone('warning');
            setStatusTitle('This LINE account is not linked yet');
            setStatusDetail(
              `${serverMessage || 'Use normal sign in first, then open Profile to connect LINE for future logins.'}`,
            );
            return;
          }

          setStatusTone('danger');
          setStatusTitle('LINE sign in failed');
          setStatusDetail(
            serverMessage ||
              'The LINE session could not be exchanged for a member session. Please retry, or use normal sign in while the operator checks LINE readiness.',
          );
          return;
        }

        setStatusTone('danger');
        setStatusTitle('Unexpected LINE sign in error');
        setStatusDetail(
          'The app could not finish the LINE sign-in flow. Please retry, or use normal sign in as a fallback.',
        );
      }
    };

    run().catch(error => {
      console.error(error);
      if (mounted) {
        setLoading(false);
        setStatusTone('danger');
        setStatusTitle('LINE sign in could not start');
        setStatusDetail(
          error instanceof Error
            ? error.message
            : 'Unexpected LIFF bootstrap failure.',
        );
      }
    });

    return () => {
      mounted = false;
    };
  }, [dispatch, lineConfig.liffId, mode, navigate, returnTo, sponsorCode]);

  return (
    <>
      <components.Header title='LINE sign in' goBack={true} />
      <div style={{padding: '36px 20px 20px 20px'}}>
        <div
          style={{
            borderRadius: 18,
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: '#06C755',
              fontSize: 13,
              marginBottom: 10,
              letterSpacing: 0.3,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            LINE LIFF ENTRY
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              lineHeight: 1.2,
              color: theme.colors.mainColor,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {statusTitle}
          </h1>
          <p
            style={{
              margin: '12px 0 0 0',
              color: getStepColor(statusTone),
              fontSize: 15,
              lineHeight: 1.7,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {statusDetail}
          </p>
          <div
            style={{
              marginTop: 16,
              color: '#64748B',
              fontSize: 12,
              lineHeight: 1.7,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            Mode: {mode}
            <br />
            Sponsor code: {sponsorCode || '-'}
            <br />
            Return to: {returnTo}
            <br />
            LIFF ID: {lineConfig.liffId || '-'}
          </div>
        </div>

        {!loading ? (
          <div
            style={{
              borderRadius: 18,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: 20,
            }}
          >
            <div
              style={{
                color: theme.colors.textColor,
                fontSize: 14,
                lineHeight: 1.7,
                marginBottom: 14,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              Safe fallback options:
            </div>
            <div style={{display: 'grid', gap: 12}}>
              <button
                onClick={() => navigate('/')}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  borderRadius: 14,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: theme.colors.mainColor,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                Use normal sign in
              </button>
              {sponsorCode ? (
                <button
                  onClick={() =>
                    navigate(buildSignUpPath(sponsorCode), {
                      state: {sponsorCode},
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: 14,
                    border: 'none',
                    backgroundColor: '#06C755',
                    color: '#FFFFFF',
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  Continue to sign up
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};
