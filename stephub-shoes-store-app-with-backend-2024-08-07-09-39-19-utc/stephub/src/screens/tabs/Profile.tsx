import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {hooks} from '../../hooks';
import {items} from '../../items';
import {svg} from '../../assets/svg';
import {URLS} from '../../config';
import {theme} from '../../constants';
import {components} from '../../components';
import {RootState} from '../../store';
import {actions} from '../../store/actions';
import {
  LineProfile,
  buildLineShareUrl,
  initializeLineLiff,
  startLineLogin,
} from '../../utils/line';

type DashboardResponse = {
  referral?: {
    memberCode?: string;
    sponsorCode?: string;
    referralCode?: string;
    referralLink?: string;
    lineReferralLink?: string;
  };
  lineBinding?: LineBindingResponse | null;
};

type ReferralResponse = {
  memberCode?: string;
  sponsorCode?: string;
  referralCode?: string;
  referralLink?: string;
  lineReferralLink?: string;
};

type SignupShareSettingsResponse = {
  shareMessage?: string;
};

type LineBindingResponse = {
  userId: string;
  memberCode: string;
  lineUserId: string;
  displayName: string | null;
  pictureUrl: string | null;
  statusMessage: string | null;
  source: string | null;
  boundAt: string;
  lastSyncedAt: string;
};

type LineBindingStatusResponse = {
  userId: string;
  memberCode: string;
  lineBinding: LineBindingResponse | null;
};

const DEFAULT_REFERRAL_MEMBER_CODE = 'TH0000013';
const COMPANY_LOGO_FALLBACK = `${URLS.BAO_BASE_URL}/favicon.ico`;
const DEFAULT_LINE_SHARE_MESSAGE = 'สมัครผ่านลิงก์แนะนำนี้ได้เลย';

const normalizeMemberCode = (code?: string | null) => {
  const normalizedCode = code?.trim().toUpperCase() || '';

  if (!normalizedCode) {
    return '';
  }

  if (normalizedCode.startsWith('THLOCAL')) {
    return DEFAULT_REFERRAL_MEMBER_CODE;
  }

  return normalizedCode;
};

const buildLocalReferralPreviewLink = (code: string) => {
  const normalizedCode = normalizeMemberCode(code);

  if (!normalizedCode) {
    return '';
  }

  return `${window.location.origin}/SignUp?sponsorCode=${encodeURIComponent(normalizedCode)}`;
};

const buildBaoAlignedReferralLink = (payload?: {
  memberCode?: string;
  sponsorCode?: string;
  referralLink?: string;
  lineReferralLink?: string;
}) => {
  const lineReferralLink = payload?.lineReferralLink?.trim();

  if (lineReferralLink) {
    return lineReferralLink;
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
      parsedUrl.searchParams.get('sponsorCode') ||
      parsedUrl.searchParams.get('sponsor_code') ||
      parsedUrl.searchParams.get('ref');

    const normalizedSponsorCode = normalizeMemberCode(rawSponsorCode);

    if (normalizedSponsorCode) {
      return buildLocalReferralPreviewLink(normalizedSponsorCode);
    }
  } catch (error) {
    console.error(error);
  }

  return rawLink;
};

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();

  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const [referralLink, setReferralLink] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [shareMessage, setShareMessage] = useState(DEFAULT_LINE_SHARE_MESSAGE);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [lineBinding, setLineBinding] = useState<LineBindingResponse | null>(null);
  const [lineStatusMessage, setLineStatusMessage] = useState('');
  const [lineLoading, setLineLoading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(
    ((user as RootState['userSlice']['user'] & {photoUrl?: string; avatarUrl?: string})?.photoUrl ||
      (user as RootState['userSlice']['user'] & {photoUrl?: string; avatarUrl?: string})?.avatarUrl ||
      COMPANY_LOGO_FALLBACK) as string,
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const nextAvatar =
      ((user as RootState['userSlice']['user'] & {photoUrl?: string; avatarUrl?: string})
        ?.photoUrl ||
        (user as RootState['userSlice']['user'] & {photoUrl?: string; avatarUrl?: string})
          ?.avatarUrl ||
        COMPANY_LOGO_FALLBACK) as string;

    setAvatarSrc(nextAvatar);
  }, [user]);

  useEffect(() => {
    const bootstrapLine = async () => {
      const result = await initializeLineLiff();

      if (result.profile) {
        setLineProfile(result.profile);
      }
    };

    bootstrapLine().catch(console.error);
  }, []);

  useEffect(() => {
    const loadReferralLink = async () => {
      const fallbackMemberCode =
        normalizeMemberCode(user?.memberCode) || DEFAULT_REFERRAL_MEMBER_CODE;

      setReferralLink(buildLocalReferralPreviewLink(fallbackMemberCode));

      try {
        if (user?.accessToken) {
          const response = await axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          });

          setLineBinding(response.data.lineBinding || null);

          const nextReferralLink = buildBaoAlignedReferralLink(response.data.referral);

          if (nextReferralLink) {
            setReferralLink(nextReferralLink);
            return;
          }
        }

        const fallbackResponse = await axios.get<ReferralResponse>(
          URLS.buildMemberReferralLinkUrl(fallbackMemberCode),
        );

        setReferralLink(
          buildBaoAlignedReferralLink(fallbackResponse.data) ||
            buildLocalReferralPreviewLink(fallbackMemberCode),
        );
      } catch (error) {
        console.error(error);
        setReferralLink(buildLocalReferralPreviewLink(fallbackMemberCode));
      }
    };

    loadReferralLink();
  }, [user?.accessToken, user?.memberCode]);

  useEffect(() => {
    const loadLineBinding = async () => {
      if (!user?.accessToken) {
        setLineBinding(null);
        return;
      }

      try {
        const response = await axios.get<LineBindingStatusResponse>(
          URLS.AUTH_LINE_BINDING,
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          },
        );

        setLineBinding(response.data.lineBinding || null);
      } catch (error) {
        console.error(error);
      }
    };

    loadLineBinding();
  }, [user?.accessToken]);

  useEffect(() => {
    const loadShareMessage = async () => {
      try {
        const response = await axios.get<SignupShareSettingsResponse>(
          URLS.GET_SIGNUP_SHARE_SETTINGS,
        );

        setShareMessage(
          response.data.shareMessage?.trim() || DEFAULT_LINE_SHARE_MESSAGE,
        );
      } catch (error) {
        console.error(error);
        setShareMessage(DEFAULT_LINE_SHARE_MESSAGE);
      }
    };

    loadShareMessage();
  }, []);

  const handleCopyReferralLink = async () => {
    if (!referralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopyMessage('คัดลอกลิงก์แนะนำแล้ว');
      window.setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      console.error(error);
      setCopyMessage('คัดลอกไม่สำเร็จ');
      window.setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const handleShareReferralLink = async () => {
    if (!referralLink) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Stephub referral link',
          text: 'สมัครผ่านลิงก์แนะนำนี้ได้เลย',
          url: referralLink,
        });
        setCopyMessage('เปิดหน้าต่างแชร์แล้ว');
      } else {
        await navigator.clipboard.writeText(referralLink);
        setCopyMessage('อุปกรณ์นี้ไม่รองรับ share จึงคัดลอกลิงก์ให้แทน');
      }
    } catch (error) {
      console.error(error);
      setCopyMessage('แชร์ไม่สำเร็จ');
    } finally {
      window.setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const handleShareViaLine = () => {
    if (!referralLink) {
      return;
    }

    try {
      const shareUrl = buildLineShareUrl(shareMessage, referralLink);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      setCopyMessage('เปิดหน้าต่างแชร์ผ่าน LINE แล้ว');
    } catch (error) {
      console.error(error);
      setCopyMessage('เปิดแชร์ผ่าน LINE ไม่สำเร็จ');
    } finally {
      window.setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const handleConnectLine = async () => {
    if (!user?.accessToken) {
      setLineStatusMessage('กรุณาเข้าสู่ระบบก่อนเชื่อม LINE');
      window.setTimeout(() => setLineStatusMessage(''), 2000);
      return;
    }

    if (!lineProfile?.userId) {
      if (!startLineLogin(window.location.href)) {
        setLineStatusMessage('ยังไม่ได้ตั้งค่า LINE LIFF/OA');
        window.setTimeout(() => setLineStatusMessage(''), 2000);
      }
      return;
    }

    setLineLoading(true);
    try {
      const response = await axios.post<LineBindingResponse>(
        URLS.AUTH_LINE_BINDING,
        {
          lineUserId: lineProfile.userId,
          lineIdToken: lineProfile.idToken || undefined,
          displayName: lineProfile.displayName,
          pictureUrl: lineProfile.pictureUrl,
          statusMessage: lineProfile.statusMessage,
          source: lineBinding ? 'line_profile_rebind' : 'line_profile_connect',
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      setLineBinding(response.data);
      setLineStatusMessage(
        lineBinding ? 'อัปเดตบัญชี LINE ที่เชื่อมแล้ว' : 'เชื่อมต่อ LINE สำเร็จ',
      );

      dispatch(
        actions.setUser({
          ...(user || {}),
          lineUserId: response.data.lineUserId,
          lineDisplayName: response.data.displayName || lineProfile.displayName,
          linePictureUrl:
            response.data.pictureUrl || lineProfile.pictureUrl || undefined,
        }),
      );
    } catch (error) {
      console.error(error);
      setLineStatusMessage('เชื่อมต่อ LINE ไม่สำเร็จ');
    } finally {
      setLineLoading(false);
      window.setTimeout(() => setLineStatusMessage(''), 2000);
    }
  };

  const renderHeader = (): JSX.Element => {
    return (
      <components.Header
        title='My profile'
        burger={true}
        basket={true}
        line={true}
      />
    );
  };

  const renderUserInfo = (): JSX.Element => {
    return (
      <div
        style={{
          marginBottom: 29,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 20px',
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            border: `2px solid ${theme.colors.aliceBlue2}`,
            backgroundColor: theme.colors.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 24px rgba(31, 41, 55, 0.08)',
          }}
        >
          <img
            src={avatarSrc}
            alt='Profile'
            onError={() => setAvatarSrc(COMPANY_LOGO_FALLBACK)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
        <div style={{minWidth: 0, display: 'flex', flexDirection: 'column'}}>
          <h3
            style={{
              fontSize: 20,
              marginBottom: 4,
              fontWeight: 'bold',
              ...theme.fonts.Mulish_700Bold,
              color: theme.colors.mainColor,
            }}
          >
            {user?.name || 'Stephub Member'}
          </h3>
          <span
            style={{
              fontSize: 14,
              lineHeight: 1.5,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {user?.email || user?.memberCode || 'Sign in to view your account'}
          </span>
        </div>
      </div>
    );
  };

  const renderMenu = (): JSX.Element => {
    return (
      <>
        <items.ProfileItem
          title='Personal info'
          icon={<svg.UserSvg />}
          onClick={() => navigate('/EditProfile')}
        />
        <items.ProfileItem
          title='เติม Wallet / Top up wallet'
          icon={<svg.GiftSvg />}
          onClick={() => navigate('/TopupWallet')}
        />
        <items.ProfileItem
          title='KYC / ยืนยันตัวตน'
          icon={<svg.InputCheckSvg />}
          onClick={() => navigate('/Kyc')}
        />
        <items.ProfileItem
          title='Order history'
          icon={<svg.CalendarSvg />}
          onClick={() => {
            navigate('/OrderHistory');
          }}
        />
        <items.ProfileItem
          title='My promocodes'
          icon={<svg.GiftSvg />}
          onClick={() => {
            navigate('/MyPromocodes');
            // navigate('/MyPromocodesEmpty');
          }}
        />
        <items.ProfileItem
          title='ทีมงาน / Team member'
          onClick={() => {
            navigate('/TeamMember');
          }}
          goNavigation={true}
          icon={
            <svg.SmartPhoneSvg
              circleColor='#E8EFF4'
              iconColor='#60708E'
            />
          }
        />
        <items.ProfileItem
          title='คอมมิชชั่น / Commission'
          onClick={() => {
            navigate('/Commission');
          }}
          goNavigation={true}
          icon={
            <svg.MailSvg
              circleColor='#E8EFF4'
              iconColor='#60708E'
            />
          }
        />
        <items.ProfileItem
          title='เปลี่ยนรหัสผ่าน / Change password'
          icon={<svg.InputCheckSvg />}
          onClick={() => {
            navigate('/ChangePassword');
          }}
        />
        <items.ProfileItem
          title='Sign out'
          icon={<svg.LogOutSvg />}
          onClick={() => {
            navigate('/SignOut');
          }}
          navIcon={false}
        />
        <items.ProfileItem
          title='Delete account'
          icon={<svg.DeleteSvg />}
          onClick={() => {
            navigate('/DeleteAccount');
          }}
          navIcon={false}
          titleStyle={{
            color: theme.colors.coralRed,
          }}
        />
      </>
    );
  };

  const renderReferralCard = (): JSX.Element | null => {
    if (!referralLink) {
      return null;
    }

    return (
      <div
        style={{
          marginBottom: 24,
          marginLeft: 20,
          marginRight: 20,
          padding: 12,
          borderRadius: 16,
          backgroundColor: '#F4F7FB',
          border: `1px solid ${theme.colors.aliceBlue2}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 12,
            minWidth: 0,
            gridTemplateColumns: 'minmax(0, 1fr) auto auto auto',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              padding: '10px 12px',
              borderRadius: 12,
              backgroundColor: theme.colors.white,
              border: `1px solid ${theme.colors.aliceBlue2}`,
              color: theme.colors.mainColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ...theme.fonts.Mulish_600SemiBold,
            }}
            title={referralLink}
          >
            {referralLink}
          </div>
          <button
            onClick={handleCopyReferralLink}
            style={{
              border: 'none',
              width: 42,
              height: 42,
              borderRadius: 12,
              cursor: 'pointer',
              backgroundColor: theme.colors.mainColor,
              color: theme.colors.mainYellow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.fonts.Mulish_700Bold,
            }}
            title='Copy'
          >
            C
          </button>
          <button
            onClick={handleShareViaLine}
            style={{
              border: 'none',
              minWidth: 58,
              height: 42,
              borderRadius: 12,
              cursor: 'pointer',
              backgroundColor: '#06C755',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              padding: '0 12px',
              ...theme.fonts.Mulish_700Bold,
            }}
            title='Share via LINE'
          >
            LINE
          </button>
          <button
            onClick={handleShareReferralLink}
            style={{
              border: 'none',
              width: 42,
              height: 42,
              borderRadius: 12,
              cursor: 'pointer',
              backgroundColor: '#F59E0B',
              color: '#1F2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              ...theme.fonts.Mulish_700Bold,
            }}
            title='Share'
          >
            ↗
          </button>
        </div>
        {copyMessage ? (
          <div
            style={{
              marginTop: 8,
              color: copyMessage.includes('ไม่สำเร็จ')
                ? theme.colors.coralRed
                : '#15803D',
              fontSize: 12,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {copyMessage}
          </div>
        ) : null}
      </div>
    );
  };

  const renderLineBindingCard = (): JSX.Element => {
    const connectedName =
      lineBinding?.displayName || user?.lineDisplayName || lineProfile?.displayName || '';
    const isConnected = Boolean(lineBinding?.lineUserId);
    const buttonLabel = !lineProfile?.userId
      ? 'เชื่อมต่อ LINE'
      : isConnected
        ? 'เชื่อมใหม่'
        : 'ยืนยันการเชื่อม';
    const helperMessage = isConnected
      ? 'ถ้าเปลี่ยนบัญชี LINE หรืออยากอัปเดตโปรไฟล์ ให้กดเชื่อมใหม่'
      : lineProfile?.displayName
        ? 'ตรวจพบ LINE profile แล้ว กดยืนยันการเชื่อมเพื่อผูกกับบัญชีสมาชิกนี้'
        : 'ถ้ายังไม่เคยผูก LINE ให้กดเชื่อมต่อ LINE ระบบจะพากลับไป LINE แล้วเชื่อมให้';

    return (
      <div
        style={{
          marginBottom: 24,
          marginLeft: 20,
          marginRight: 20,
          padding: 16,
          borderRadius: 16,
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
          <div style={{minWidth: 0}}>
            <div
              style={{
                color: theme.colors.mainColor,
                fontSize: 18,
                marginBottom: 4,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              LINE account
            </div>
            <div
              style={{
                color: theme.colors.textColor,
                fontSize: 14,
                lineHeight: 1.6,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {isConnected
                ? `เชื่อมแล้วกับ LINE: ${connectedName || lineBinding?.lineUserId}`
                : lineProfile?.displayName
                  ? `พบ LINE profile: ${lineProfile.displayName}`
                  : 'ยังไม่ได้เชื่อม LINE กับบัญชีนี้'}
            </div>
            <div
              style={{
                marginTop: 4,
                color: '#64748B',
                fontSize: 12,
                lineHeight: 1.6,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {helperMessage}
            </div>
          </div>
          <button
            onClick={handleConnectLine}
            disabled={lineLoading}
            style={{
              border: 'none',
              minWidth: 116,
              height: 42,
              borderRadius: 12,
              cursor: 'pointer',
              backgroundColor: '#06C755',
              color: '#FFFFFF',
              padding: '0 14px',
              opacity: lineLoading ? 0.7 : 1,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {lineLoading ? 'กำลังเชื่อม...' : buttonLabel}
          </button>
        </div>
        {lineBinding?.boundAt ? (
          <div
            style={{
              marginTop: 10,
              color: '#64748B',
              fontSize: 12,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            เชื่อมล่าสุด: {lineBinding.lastSyncedAt || lineBinding.boundAt}
          </div>
        ) : null}
        {lineStatusMessage ? (
          <div
            style={{
              marginTop: 10,
              color: lineStatusMessage.includes('ไม่สำเร็จ')
                ? theme.colors.coralRed
                : '#15803D',
              fontSize: 12,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {lineStatusMessage}
          </div>
        ) : null}
      </div>
    );
  };

  const renderContent = () => {
    return (
      <div style={{paddingTop: 40, paddingBottom: 64 + 30}}>
        {renderUserInfo()}
        {renderLineBindingCard()}
        {renderReferralCard()}
        {renderMenu()}
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
