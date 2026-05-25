import axios from 'axios';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {components} from '../components';
import {theme} from '../constants';
import {URLS} from '../config';
import {hooks} from '../hooks';
import {RootState} from '../store';
import {actions} from '../store/actions';
import {
  buildPublicSignUpUrl,
  buildLineShareUrl,
  buildLineLoginCallbackUrl,
  buildSignUpPath,
  extractPlacementPreferenceFromSearch,
  extractSponsorCodeFromSearch,
  getLineConfig,
  initializeLineLiff,
  normalizePlacementPreference,
  normalizeSponsorCode,
  resolveSignupSponsorCode,
  parseLineCallbackSearch,
  resolveSafeReturnTo,
  type LineEntryMode,
  type SignupPlacementPreference,
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

type LineBindingResponse = {
  lineUserId: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  statusMessage?: string | null;
  source?: string | null;
  boundAt?: string | null;
  lastSyncedAt?: string | null;
};

type StepTone = 'neutral' | 'success' | 'warning' | 'danger';

type DashboardResponse = {
  referral?: {
    memberCode?: string;
    sponsorCode?: string;
    referralCode?: string;
    referralLink?: string;
    lineReferralLink?: string;
  };
};

type ReferralResponse = {
  memberCode?: string;
  sponsorCode?: string;
  referralCode?: string;
  referralLink?: string;
  lineReferralLink?: string;
};

type SignupShareSettingsResponse = {
  shareLinkMessage?: string;
  signupSuccessMessage?: string;
  shareMessage?: string;
};

type WindowWithSharePicker = Window & {
  liff?: {
    shareTargetPicker?(
      messages: Array<{
        type: 'text';
        text: string;
      }>,
    ): Promise<unknown | null>;
  };
};

const DEFAULT_LINE_SHARE_MESSAGE = 'สมัครผ่านลิงก์แนะนำนี้ได้เลย';

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

const normalizeMemberCode = (code?: string | null) => {
  const normalizedCode = code?.trim().toUpperCase() || '';
  return normalizedCode || '';
};

const buildLocalReferralPreviewLink = (code: string) => {
  const normalizedCode = normalizeMemberCode(code);

  if (!normalizedCode) {
    return '';
  }

  return buildPublicSignUpUrl(normalizedCode);
};

const buildBaoAlignedReferralLink = (payload?: {
  memberCode?: string;
  sponsorCode?: string;
  referralCode?: string;
  referralLink?: string;
  lineReferralLink?: string;
}) => {
  const referralCode = normalizeMemberCode(payload?.referralCode);

  if (referralCode) {
    return buildLocalReferralPreviewLink(referralCode);
  }

  const sponsorCode = normalizeMemberCode(payload?.sponsorCode || payload?.memberCode);

  if (sponsorCode) {
    return buildLocalReferralPreviewLink(sponsorCode);
  }

  const rawLink = payload?.referralLink?.trim();

  if (!rawLink) {
    return '';
  }

  try {
    const parsedUrl = new URL(rawLink);
    const rawSponsorCode =
      parsedUrl.searchParams.get('ref') ||
      parsedUrl.searchParams.get('sponsorCode') ||
      parsedUrl.searchParams.get('sponsor_code');

    const normalizedSponsorCode = normalizeMemberCode(rawSponsorCode);

    if (normalizedSponsorCode) {
      return buildLocalReferralPreviewLink(normalizedSponsorCode);
    }
  } catch (error) {
    console.error(error);
  }

  return rawLink;
};

const buildShareText = (shareMessage: string, referralLink: string) =>
  [shareMessage.trim(), referralLink.trim()].filter(Boolean).join('\n');

const openLineShareFallback = (shareMessage: string, referralLink: string) => {
  window.location.assign(buildLineShareUrl(shareMessage, referralLink));
};

export const LineLiffSignIn: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const lineConfig = useMemo(() => getLineConfig(), []);
  const query = useMemo(
    () => parseLineCallbackSearch(location.search),
    [location.search],
  );
  const rawSponsorCode = useMemo(
    () => query.get('sponsorCode') || extractSponsorCodeFromSearch(location.search),
    [location.search, query],
  );
  const placementPreference = useMemo<SignupPlacementPreference>(
    () =>
      normalizePlacementPreference(
        query.get('placement') || extractPlacementPreferenceFromSearch(location.search),
      ),
    [location.search, query],
  );
  const mode = useMemo(() => parseMode(query.get('mode')), [query]);
  const sponsorCode = useMemo(
    () =>
      mode === 'signup'
        ? resolveSignupSponsorCode(rawSponsorCode)
        : normalizeSponsorCode(rawSponsorCode),
    [mode, rawSponsorCode],
  );
  const returnTo = useMemo(
    () =>
      resolveSafeReturnTo(
        query.get('returnTo'),
        mode === 'signup' || sponsorCode
          ? buildSignUpPath(sponsorCode, placementPreference)
          : '/TabNavigator',
      ),
    [mode, placementPreference, query, sponsorCode],
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
        if (mode === 'signup' && sponsorCode) {
          navigate(buildSignUpPath(sponsorCode, placementPreference), {
            replace: true,
            state: {sponsorCode, placementPreference},
          });
          return;
        }

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
            placementPreference,
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
        navigate(buildSignUpPath(sponsorCode, placementPreference), {
          replace: true,
          state: {sponsorCode, placementPreference},
        });
        return;
      }

      if (mode === 'connect') {
        if (!user?.accessToken) {
          setLoading(false);
          setStatusTone('warning');
          setStatusTitle('Please sign in before connecting LINE');
          setStatusDetail(
            'This callback was opened for LINE connect, but the member session is missing on this device. Sign in normally first, then retry the connect LINE button from Profile.',
          );
          return;
        }

        setStatusTone('neutral');
        setStatusTitle('Connecting LINE to this member');
        setStatusDetail(
          'The current LINE profile is being attached to the signed-in member account.',
        );

        try {
          const response = await axios.post<LineBindingResponse>(
            URLS.AUTH_LINE_BINDING,
            {
              lineUserId: profile.userId,
              lineIdToken: profile.idToken || undefined,
              displayName: profile.displayName,
              pictureUrl: profile.pictureUrl,
              statusMessage: profile.statusMessage,
              source: 'line_liff_connect_callback',
            },
            {
              headers: {
                Authorization: `Bearer ${user.accessToken}`,
              },
            },
          );

          dispatch(
            actions.setUser({
              ...(user || {}),
              lineUserId: response.data.lineUserId || profile.userId,
              lineDisplayName: response.data.displayName || profile.displayName,
              linePictureUrl:
                response.data.pictureUrl || profile.pictureUrl || undefined,
            }),
          );

          navigate(returnTo, {replace: true});
          return;
        } catch (error: unknown) {
          if (!mounted) {
            return;
          }

          setLoading(false);

          if (axios.isAxiosError(error)) {
            const serverMessage = error.response?.data?.message || '';

            setStatusTone('danger');
            setStatusTitle('LINE connect failed');
            setStatusDetail(
              serverMessage ||
                'The signed-in member session could not attach this LINE account. Please retry from Profile, or sign in normally again before reconnecting LINE.',
            );
            return;
          }

          setStatusTone('danger');
          setStatusTitle('Unexpected LINE connect error');
          setStatusDetail(
            'The app could not complete the LINE connect callback. Please retry from Profile.',
          );
          return;
        }
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
            navigate(buildSignUpPath(sponsorCode, placementPreference), {
              replace: true,
              state: {sponsorCode, placementPreference},
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
  }, [
    dispatch,
    lineConfig.liffId,
    mode,
    navigate,
    placementPreference,
    returnTo,
    sponsorCode,
    user,
  ]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        padding: '24px 20px 32px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
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
            Referral code: {sponsorCode || '-'}
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
                    navigate(buildSignUpPath(sponsorCode, placementPreference), {
                      state: {sponsorCode, placementPreference},
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
    </div>
  );
};

export const LineRichMenuShare: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const autoShareStartedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [statusTone, setStatusTone] = useState<StepTone>('neutral');
  const [statusTitle, setStatusTitle] = useState('กำลังเตรียมลิงก์แชร์จาก LINE OA');
  const [statusDetail, setStatusDetail] = useState(
    'ระบบจะตรวจสอบ LINE session ดึงลิงก์แนะนำของสมาชิก แล้วเปิดหน้าต่างแชร์ให้โดยอัตโนมัติ',
  );
  const [shareMessage, setShareMessage] = useState(DEFAULT_LINE_SHARE_MESSAGE);
  const [referralLink, setReferralLink] = useState('');

  const shareText = useMemo(
    () => buildShareText(shareMessage, referralLink),
    [shareMessage, referralLink],
  );

  useEffect(() => {
    let mounted = true;

    const resolveMemberSession = async () => {
      const bootstrap = await initializeLineLiff();

      if (!mounted) {
        return null;
      }

      if (bootstrap.errorMessage && !bootstrap.isReady) {
        setLoading(false);
        setStatusTone('danger');
        setStatusTitle('ยังเปิด flow แชร์จาก LINE ไม่ได้');
        setStatusDetail(
          `${bootstrap.errorMessage} กรุณาเปิดผ่าน LINE OA หรือให้ทีมงานตรวจสอบ LIFF configuration ก่อน`,
        );
        return null;
      }

      if (!bootstrap.isLoggedIn) {
        setStatusTone('neutral');
        setStatusTitle('กำลังพาไป login LINE');
        setStatusDetail('เมื่อ login แล้ว ระบบจะกลับมาหน้านี้และเปิดแชร์ให้อีกครั้งโดยอัตโนมัติ');

        const liff = (window as Window & {
          liff?: {login(input?: {redirectUri?: string}): void};
        }).liff;

        if (!liff) {
          setLoading(false);
          setStatusTone('danger');
          setStatusTitle('LIFF SDK ยังไม่พร้อม');
          setStatusDetail('หน้านี้ยังไม่สามารถเรียก LINE login ได้ในตอนนี้');
          return null;
        }

        liff.login({redirectUri: window.location.href});
        return null;
      }

      if (!bootstrap.profile?.userId) {
        setLoading(false);
        setStatusTone('warning');
        setStatusTitle('พบ LINE session แต่ยังอ่าน profile ไม่ได้');
        setStatusDetail('ลองปิดหน้าเดิมแล้วเปิดจาก rich menu อีกครั้ง หรือเข้า Sign in ปกติก่อนแล้วค่อยลองใหม่');
        return null;
      }

      const persistedAccessToken = user?.accessToken?.trim() || '';
      const persistedLineUserId = user?.lineUserId?.trim() || '';
      const hasMatchingPersistedLineSession =
        Boolean(persistedAccessToken) &&
        Boolean(persistedLineUserId) &&
        persistedLineUserId === bootstrap.profile.userId;

      if (hasMatchingPersistedLineSession) {
        return {
          accessToken: persistedAccessToken,
          memberCode: normalizeMemberCode(user?.memberCode),
        };
      }

      setStatusTone('neutral');
      setStatusTitle('กำลังตรวจสอบสมาชิกจาก LINE');
      setStatusDetail('ระบบกำลังจับคู่บัญชี LINE กับสมาชิกเพื่อสร้างลิงก์แนะนำส่วนตัว');

      const response = await axios.post<LineLoginResponse>(
        URLS.AUTH_LINE_LOGIN,
        {
          lineUserId: bootstrap.profile.userId,
          lineIdToken: bootstrap.profile.idToken || undefined,
        },
        {
          withCredentials: true,
        },
      );

      dispatch(
        actions.setUser({
          userId: response.data.user?.userId,
          memberCode: response.data.user?.memberCode,
          name: response.data.user?.name || bootstrap.profile.displayName,
          lineUserId: bootstrap.profile.userId,
          lineDisplayName:
            response.data.lineBinding?.displayName || bootstrap.profile.displayName,
          linePictureUrl:
            response.data.lineBinding?.pictureUrl || bootstrap.profile.pictureUrl || undefined,
          email: response.data.user?.email ?? '',
          phone: response.data.user?.phone ?? '',
          accessToken: response.data.accessToken,
        }),
      );
      dispatch(actions.setRememberMe(true));

      return {
        accessToken: response.data.accessToken,
        memberCode: normalizeMemberCode(response.data.user?.memberCode),
      };
    };

    const loadSharePayload = async () => {
      try {
        const session = await resolveMemberSession();

        if (!mounted || !session?.accessToken) {
          return;
        }

        const [dashboardResponse, shareSettingsResponse] = await Promise.all([
          axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }),
          axios.get<SignupShareSettingsResponse>(URLS.GET_SIGNUP_SHARE_SETTINGS),
        ]);

        const nextShareMessage =
          shareSettingsResponse.data.shareLinkMessage?.trim() ||
          shareSettingsResponse.data.shareMessage?.trim() ||
          DEFAULT_LINE_SHARE_MESSAGE;
        const dashboardReferralLink = buildBaoAlignedReferralLink(
          dashboardResponse.data.referral,
        );

        let nextReferralLink = dashboardReferralLink;

        if (!nextReferralLink && session.memberCode) {
          const fallbackResponse = await axios.get<ReferralResponse>(
            URLS.buildMemberReferralLinkUrl(session.memberCode),
          );

          nextReferralLink =
            buildBaoAlignedReferralLink(fallbackResponse.data) ||
            buildLocalReferralPreviewLink(session.memberCode);
        }

        if (!mounted) {
          return;
        }

        if (!nextReferralLink) {
          setLoading(false);
          setStatusTone('warning');
          setStatusTitle('ยังสร้างลิงก์แนะนำไม่สำเร็จ');
          setStatusDetail('พบสมาชิกแล้ว แต่ยังไม่มี referral link ให้แชร์ในตอนนี้');
          return;
        }

        setShareMessage(nextShareMessage);
        setReferralLink(nextReferralLink);
        setStatusTone('neutral');
        setStatusTitle('พร้อมแชร์ลิงก์แนะนำแล้ว');
        setStatusDetail('ถ้าอยู่ใน LINE ระบบจะเปิด share picker ให้ทันที หากไม่ขึ้นสามารถกดปุ่มแชร์ด้านล่างได้');
        setLoading(false);
      } catch (error) {
        console.error(error);

        if (!mounted) {
          return;
        }

        setLoading(false);

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          setStatusTone('warning');
          setStatusTitle('LINE account นี้ยังไม่ได้ผูกกับสมาชิก');
          setStatusDetail('กรุณา sign in ปกติก่อน แล้วไปที่หน้า Profile เพื่อเชื่อม LINE จากนั้นค่อยกลับมากด rich menu อีกครั้ง');
          return;
        }

        setStatusTone('danger');
        setStatusTitle('เตรียมลิงก์แชร์ไม่สำเร็จ');
        setStatusDetail(
          axios.isAxiosError(error)
            ? error.response?.data?.message || error.message
            : error instanceof Error
              ? error.message
              : 'Unexpected share preparation error',
        );
      }
    };

    loadSharePayload().catch(console.error);

    return () => {
      mounted = false;
    };
  }, [dispatch, user?.accessToken, user?.lineUserId, user?.memberCode]);

  useEffect(() => {
    let cancelled = false;

    const autoShare = async () => {
      if (loading || !referralLink || autoShareStartedRef.current) {
        return;
      }

      autoShareStartedRef.current = true;

      const liff = (window as WindowWithSharePicker).liff;

      try {
        if (liff?.shareTargetPicker) {
          setStatusTone('neutral');
          setStatusTitle('กำลังเปิดหน้าต่างแชร์ใน LINE');
          setStatusDetail('เลือกห้องแชทหรือเพื่อนที่ต้องการส่งลิงก์แนะนำได้เลย');

          const result = await liff.shareTargetPicker([
            {
              type: 'text',
              text: shareText,
            },
          ]);

          if (cancelled) {
            return;
          }

          if (result === null) {
            setStatusTone('warning');
            setStatusTitle('ยกเลิกการแชร์ไว้ก่อน');
            setStatusDetail('สามารถกด "แชร์ผ่าน LINE อีกครั้ง" ด้านล่างได้ทุกเมื่อ');
            return;
          }

          setStatusTone('success');
          setStatusTitle('แชร์ลิงก์แนะนำผ่าน LINE แล้ว');
          setStatusDetail('rich menu นี้พร้อมใช้ต่อได้เลย ถ้าต้องการแชร์ซ้ำสามารถกดปุ่มเดิมอีกครั้ง');
          return;
        }

        openLineShareFallback(shareMessage, referralLink);
      } catch (error) {
        console.error(error);

        if (cancelled) {
          return;
        }

        try {
          openLineShareFallback(shareMessage, referralLink);
          return;
        } catch (fallbackError) {
          console.error(fallbackError);
        }

        setStatusTone('warning');
        setStatusTitle('เปิดแชร์อัตโนมัติไม่สำเร็จ');
        setStatusDetail('ยังสามารถกดปุ่มแชร์หรือคัดลอกลิงก์ด้านล่างเพื่อส่งต่อเองได้');
      }
    };

    autoShare().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [loading, referralLink, shareMessage, shareText]);

  const handleShareViaLine = async () => {
    if (!referralLink) {
      return;
    }

    const liff = (window as WindowWithSharePicker).liff;

    try {
      if (liff?.shareTargetPicker) {
        const result = await liff.shareTargetPicker([
          {
            type: 'text',
            text: shareText,
          },
        ]);

        if (result === null) {
          setStatusTone('warning');
          setStatusTitle('ยกเลิกการแชร์ไว้ก่อน');
          setStatusDetail('ลิงก์ยังอยู่ในหน้านี้ สามารถกลับมาแชร์ใหม่ได้');
          return;
        }
      } else {
        openLineShareFallback(shareMessage, referralLink);
        return;
      }

      setStatusTone('success');
      setStatusTitle('แชร์ผ่าน LINE แล้ว');
      setStatusDetail('สามารถกลับไปหน้าแอปหลักหรือแชร์ซ้ำได้ตามต้องการ');
    } catch (error) {
      console.error(error);

      try {
        openLineShareFallback(shareMessage, referralLink);
        return;
      } catch (fallbackError) {
        console.error(fallbackError);
      }

      setStatusTone('danger');
      setStatusTitle('แชร์ผ่าน LINE ไม่สำเร็จ');
      setStatusDetail('ลองกดอีกครั้ง หรือคัดลอกลิงก์ด้านล่างแทน');
    }
  };

  const handleCopyLink = async () => {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setStatusTone('success');
      setStatusTitle('คัดลอกลิงก์แนะนำแล้ว');
      setStatusDetail('สามารถนำไปวางในแชท LINE หรือช่องทางอื่นต่อได้ทันที');
    } catch (error) {
      console.error(error);
      setStatusTone('danger');
      setStatusTitle('คัดลอกลิงก์ไม่สำเร็จ');
      setStatusDetail('อุปกรณ์นี้อาจไม่อนุญาตให้คัดลอกอัตโนมัติ ลองกดแชร์ผ่าน LINE แทน');
    }
  };

  return (
    <>
      <components.Header title='LINE OA Share' goBack={true} />
      <div style={{padding: '36px 20px 28px 20px'}}>
        <div
          style={{
            borderRadius: 20,
            border: '1px solid #DCFCE7',
            background: 'linear-gradient(180deg, #F0FDF4 0%, #F8FAFC 100%)',
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: '#166534',
              fontSize: 22,
              marginBottom: 8,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            แชร์ลิงก์แนะนำจาก LINE OA
          </div>
          <div
            style={{
              color: getStepColor(statusTone),
              fontSize: 16,
              marginBottom: 8,
              lineHeight: 1.6,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {statusTitle}
          </div>
          <div
            style={{
              color: theme.colors.textColor,
              fontSize: 14,
              lineHeight: 1.7,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {statusDetail}
          </div>
        </div>

        {referralLink ? (
          <div
            style={{
              borderRadius: 18,
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              padding: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                color: theme.colors.mainColor,
                fontSize: 14,
                marginBottom: 8,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              ลิงก์แนะนำของคุณ
            </div>
            <div
              style={{
                color: '#334155',
                fontSize: 13,
                lineHeight: 1.7,
                wordBreak: 'break-all',
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {referralLink}
            </div>
          </div>
        ) : null}

        <div style={{display: 'grid', gap: 12}}>
          <button
            onClick={handleShareViaLine}
            disabled={!referralLink || loading}
            style={{
              border: 'none',
              height: 48,
              borderRadius: 14,
              cursor: !referralLink || loading ? 'not-allowed' : 'pointer',
              backgroundColor: '#06C755',
              color: '#FFFFFF',
              opacity: !referralLink || loading ? 0.7 : 1,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            แชร์ผ่าน LINE อีกครั้ง
          </button>
          <button
            onClick={handleCopyLink}
            disabled={!referralLink || loading}
            style={{
              border: `1px solid ${theme.colors.aliceBlue2}`,
              height: 48,
              borderRadius: 14,
              cursor: !referralLink || loading ? 'not-allowed' : 'pointer',
              backgroundColor: '#FFFFFF',
              color: theme.colors.mainColor,
              opacity: !referralLink || loading ? 0.7 : 1,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            คัดลอกลิงก์
          </button>
          <button
            onClick={() => navigate('/TabNavigator')}
            style={{
              border: `1px solid ${theme.colors.aliceBlue2}`,
              height: 48,
              borderRadius: 14,
              cursor: 'pointer',
              backgroundColor: '#F8FAFC',
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            กลับไปหน้าแอปหลัก
          </button>
        </div>
      </div>
    </>
  );
};
