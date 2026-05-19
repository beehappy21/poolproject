import axios from 'axios';
import React, {useEffect, useRef, useState} from 'react';
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
  buildPublicSignUpUrl,
  buildLineLiffLaunchUrl,
  initializeLineLiff,
  type SignupPlacementPreference,
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

type DirectReferralsResponse = {
  member?: {
    memberId?: string;
    memberCode?: string;
    referralCode?: string;
    name?: string;
    sponsorId?: string | null;
  };
  directReferrals?: Array<{
    memberId?: string;
    memberCode?: string;
    referralCode?: string;
    name?: string;
    sponsorId?: string | null;
    placementSide?: 'LEFT' | 'MIDDLE' | 'RIGHT' | null;
    childCount?: number;
  }>;
};

type SignupShareSettingsResponse = {
  shareLinkMessage?: string;
  signupSuccessMessage?: string;
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

const DEFAULT_PROFILE_AVATAR = '/16.png';
const DEFAULT_LINE_SHARE_MESSAGE = 'สมัครผ่านลิงก์แนะนำนี้ได้เลย';
const PROFILE_AVATAR_STORAGE_KEY = 'blifehealthy_profile_avatar';

const getStoredProfileAvatar = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    return window.localStorage.getItem(PROFILE_AVATAR_STORAGE_KEY) || '';
  } catch (error) {
    console.error(error);
    return '';
  }
};

const getPreferredAvatar = (
  user?: RootState['userSlice']['user'] & {photoUrl?: string; avatarUrl?: string},
) => {
  return (
    getStoredProfileAvatar() ||
    user?.photoUrl ||
    user?.avatarUrl ||
    DEFAULT_PROFILE_AVATAR
  );
};

const normalizeMemberCode = (code?: string | null) => {
  const normalizedCode = code?.trim().toUpperCase() || '';

  if (!normalizedCode) {
    return '';
  }

  return normalizedCode;
};

const buildLocalReferralPreviewLink = (
  code: string,
  placementPreference?: SignupPlacementPreference,
) => {
  const normalizedCode = normalizeMemberCode(code);

  if (!normalizedCode) {
    return '';
  }

  return buildPublicSignUpUrl(normalizedCode, placementPreference);
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

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = hooks.useAppDispatch();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [directReferralCount, setDirectReferralCount] = useState(0);
  const [directReferralPlacementSides, setDirectReferralPlacementSides] =
    useState<Array<'LEFT' | 'MIDDLE' | 'RIGHT'>>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<
    SignupPlacementPreference
  >('AUTO');
  const [copyMessage, setCopyMessage] = useState('');
  const [shareMessage, setShareMessage] = useState(DEFAULT_LINE_SHARE_MESSAGE);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [lineBinding, setLineBinding] = useState<LineBindingResponse | null>(null);
  const [lineStatusMessage, setLineStatusMessage] = useState('');
  const [lineLoading, setLineLoading] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState(
    getPreferredAvatar(
      user as RootState['userSlice']['user'] & {photoUrl?: string; avatarUrl?: string},
    ) as string,
  );
  const [avatarMessage, setAvatarMessage] = useState('');
  const showLineStatus = (message: string) => {
    setLineStatusMessage(message);
    window.setTimeout(() => setLineStatusMessage(''), 6000);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const nextAvatar = getPreferredAvatar(
      user as RootState['userSlice']['user'] & {photoUrl?: string; avatarUrl?: string},
    ) as string;

    setAvatarSrc(nextAvatar);
  }, [user]);

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setAvatarMessage('กรุณาเลือกรูปภาพจากอุปกรณ์เท่านั้น');
      window.setTimeout(() => setAvatarMessage(''), 2500);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const nextAvatar = typeof reader.result === 'string' ? reader.result : '';

      if (!nextAvatar) {
        setAvatarMessage('ไม่สามารถอ่านรูปที่เลือกได้');
        window.setTimeout(() => setAvatarMessage(''), 2500);
        return;
      }

      try {
        window.localStorage.setItem(PROFILE_AVATAR_STORAGE_KEY, nextAvatar);
      } catch (error) {
        console.error(error);
      }

      setAvatarSrc(nextAvatar);
      setAvatarMessage('อัปเดตรูปโปรไฟล์แล้ว');
      window.setTimeout(() => setAvatarMessage(''), 2500);
    };

    reader.onerror = () => {
      setAvatarMessage('ไม่สามารถอ่านรูปที่เลือกได้');
      window.setTimeout(() => setAvatarMessage(''), 2500);
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  };

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
      const currentMemberCode = normalizeMemberCode(user?.memberCode);

      if (!currentMemberCode) {
        setReferralLink('');
        setReferralCode('');
        return;
      }

      setReferralLink(buildLocalReferralPreviewLink(currentMemberCode));
      setReferralCode('');

      try {
        if (user?.accessToken) {
          const response = await axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          });

          setLineBinding(response.data.lineBinding || null);

          const nextReferralLink = buildBaoAlignedReferralLink(response.data.referral);
          const nextReferralCode = normalizeMemberCode(
            response.data.referral?.referralCode,
          );

          if (nextReferralCode) {
            setReferralCode(nextReferralCode);
          }

          if (nextReferralLink) {
            setReferralLink(nextReferralLink);
            return;
          }
        }

        const fallbackResponse = await axios.get<ReferralResponse>(
          URLS.buildMemberReferralLinkUrl(currentMemberCode),
        );

        setReferralCode(
          normalizeMemberCode(fallbackResponse.data.referralCode) || currentMemberCode,
        );

        setReferralLink(
          buildBaoAlignedReferralLink(fallbackResponse.data) ||
            buildLocalReferralPreviewLink(currentMemberCode),
        );
      } catch (error) {
        console.error(error);
        setReferralCode(currentMemberCode);
        setReferralLink(buildLocalReferralPreviewLink(currentMemberCode));
      }
    };

    loadReferralLink();
  }, [user?.accessToken, user?.memberCode]);

  useEffect(() => {
    const loadDirectReferrals = async () => {
      const currentMemberCode = normalizeMemberCode(user?.memberCode);

      if (!currentMemberCode) {
        setDirectReferralCount(0);
        return;
      }

      try {
        const response = await axios.get<DirectReferralsResponse>(
          URLS.buildMemberDirectReferralsUrl(currentMemberCode),
        );

        setDirectReferralCount(response.data.directReferrals?.length || 0);
        setDirectReferralPlacementSides(
          (response.data.directReferrals || [])
            .map(referral => referral.placementSide || '')
            .filter(
              (
                placementSide,
              ): placementSide is 'LEFT' | 'MIDDLE' | 'RIGHT' =>
                placementSide === 'LEFT' ||
                placementSide === 'MIDDLE' ||
                placementSide === 'RIGHT',
            ),
        );
      } catch (error) {
        console.error(error);
        setDirectReferralCount(0);
        setDirectReferralPlacementSides([]);
      }
    };

    loadDirectReferrals();
  }, [user?.memberCode]);

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
          response.data.shareLinkMessage?.trim() ||
            response.data.shareMessage?.trim() ||
            DEFAULT_LINE_SHARE_MESSAGE,
        );
      } catch (error) {
        console.error(error);
        setShareMessage(DEFAULT_LINE_SHARE_MESSAGE);
      }
    };

    loadShareMessage();
  }, []);

  const handleCopyReferralLink = async () => {
    const effectiveReferralCode =
      referralCode || normalizeMemberCode(user?.memberCode) || '';
    const activeReferralLink =
      buildLocalReferralPreviewLink(effectiveReferralCode, selectedPlacement) ||
      referralLink;

    if (!activeReferralLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeReferralLink);
      setCopyMessage('คัดลอกลิงก์แนะนำแล้ว');
      window.setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      console.error(error);
      setCopyMessage('คัดลอกไม่สำเร็จ');
      window.setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const handleShareReferralLink = async () => {
    const effectiveReferralCode =
      referralCode || normalizeMemberCode(user?.memberCode) || '';
    const activeReferralLink =
      buildLocalReferralPreviewLink(effectiveReferralCode, selectedPlacement) ||
      referralLink;

    if (!activeReferralLink) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Stephub referral link',
          text: shareMessage.trim() || DEFAULT_LINE_SHARE_MESSAGE,
          url: activeReferralLink,
        });
        setCopyMessage('เปิดหน้าต่างแชร์แล้ว');
      } else {
        await navigator.clipboard.writeText(activeReferralLink);
        setCopyMessage('อุปกรณ์นี้ไม่รองรับ share จึงคัดลอกลิงก์ให้แทน');
      }
    } catch (error) {
      console.error(error);
      setCopyMessage('แชร์ไม่สำเร็จ');
    } finally {
      window.setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const handleConnectLine = async () => {
    if (!user?.accessToken) {
      showLineStatus('กรุณาเข้าสู่ระบบก่อนเชื่อม LINE แล้วกลับมาหน้านี้อีกครั้ง');
      return;
    }

    if (!lineProfile?.userId) {
      window.location.assign(
        buildLineLiffLaunchUrl({
          mode: 'connect',
          returnTo: '/TabNavigator',
        }),
      );
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
      showLineStatus(
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
      showLineStatus(
        'เชื่อมต่อ LINE ไม่สำเร็จ กรุณาตรวจสอบว่าเปิดผ่าน LINE/LIFF ถูกต้อง แล้วลองกดเชื่อมอีกครั้ง หากยังไม่ได้ให้ sign in ปกติก่อนแล้วค่อย reconnect',
      );
    } finally {
      setLineLoading(false);
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
    const connectedName =
      lineBinding?.displayName || user?.lineDisplayName || lineProfile?.displayName || '';
    const isConnected = Boolean(lineBinding?.lineUserId);
    const buttonLabel = !lineProfile?.userId
      ? 'เชื่อมต่อ LINE'
      : isConnected
        ? 'เชื่อมใหม่'
        : 'ยืนยันการเชื่อม';

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
          onClick={handleAvatarPick}
          role='button'
          tabIndex={0}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleAvatarPick();
            }
          }}
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
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <input
            ref={avatarInputRef}
            type='file'
            accept='image/*'
            onChange={handleAvatarChange}
            style={{display: 'none'}}
          />
          <img
            src={avatarSrc}
            alt='Profile'
            onError={() => setAvatarSrc(DEFAULT_PROFILE_AVATAR)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.62)',
              color: '#fff',
              fontSize: 9,
              lineHeight: 1.4,
              textAlign: 'center',
              padding: '3px 4px',
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            เปลี่ยนรูป
          </div>
        </div>
        <div style={{minWidth: 0, display: 'flex', flexDirection: 'column', flex: 1}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <h3
              style={{
                fontSize: 20,
                marginBottom: 4,
                fontWeight: 'bold',
                ...theme.fonts.Mulish_700Bold,
                color: theme.colors.mainColor,
                minWidth: 0,
                flex: 1,
              }}
            >
              {user?.name || 'Stephub Member'}
            </h3>
            <button
              onClick={handleConnectLine}
              disabled={lineLoading}
              style={{
                border: 'none',
                minWidth: 66,
                height: 24,
                borderRadius: 999,
                cursor: 'pointer',
                backgroundColor: '#06C755',
                color: '#FFFFFF',
                padding: '0 8px',
                flexShrink: 0,
                opacity: lineLoading ? 0.7 : 1,
                fontSize: 11,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {lineLoading ? 'กำลังเชื่อม...' : buttonLabel}
            </button>
          </div>
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
          {lineStatusMessage ? (
            <span
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: lineStatusMessage.includes('ไม่สำเร็จ')
                  ? theme.colors.coralRed
                  : '#15803D',
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {lineStatusMessage}
            </span>
          ) : avatarMessage ? (
            <span
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: '#15803D',
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {avatarMessage}
            </span>
          ) : connectedName ? (
            <span
              style={{
                marginTop: 6,
                fontSize: 12,
                lineHeight: 1.5,
                color: '#64748B',
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              LINE: {connectedName}
            </span>
          ) : null}
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
      </>
    );
  };

  const renderReferralCard = (): JSX.Element | null => {
    const effectiveReferralCode =
      referralCode || normalizeMemberCode(user?.memberCode) || '';
    const activeReferralLink =
      buildLocalReferralPreviewLink(effectiveReferralCode, selectedPlacement) ||
      referralLink;
    const hasLeftDirect = directReferralPlacementSides.includes('LEFT');
    const hasMiddleDirect = directReferralPlacementSides.includes('MIDDLE');
    const hasRightDirect = directReferralPlacementSides.includes('RIGHT');
    const placementUnlocked = hasLeftDirect && hasMiddleDirect && hasRightDirect;

    if (!activeReferralLink) {
      return null;
    }

    const helperText = placementUnlocked
      ? 'AUTO พร้อมใช้งานแล้ว โดยระบบจะลงขาที่ไม่มีคะแนนก่อน หรือขาที่คะแนน PV รวมน้อยสุด และสามารถเลือก L / M / R สำหรับลิงก์แนะนำสมาชิกได้แล้ว'
      : `ก่อนครบ 3 ขา ระบบจะใช้ AUTO เท่านั้น ตอนนี้สมาชิกสายตรง ${directReferralCount} คน และครบ L:${hasLeftDirect ? '1' : '0'} / M:${hasMiddleDirect ? '1' : '0'} / R:${hasRightDirect ? '1' : '0'} เมื่อครบทั้ง 3 สายจึงจะเปิดลิงก์กำหนดขาได้`;
    const placementOptions: Array<{
      label: 'AUTO' | 'LEFT' | 'MIDDLE' | 'RIGHT';
      shortLabel: 'AUTO' | 'L' | 'M' | 'R';
      disabled: boolean;
    }> = [
      {label: 'AUTO', shortLabel: 'AUTO', disabled: false},
      {label: 'LEFT', shortLabel: 'L', disabled: !placementUnlocked},
      {label: 'MIDDLE', shortLabel: 'M', disabled: !placementUnlocked},
      {label: 'RIGHT', shortLabel: 'R', disabled: !placementUnlocked},
    ];

    return (
      <div
        style={{
          marginBottom: 24,
          marginLeft: 20,
          marginRight: 20,
          padding: 18,
          borderRadius: 0,
          background:
            'linear-gradient(135deg, rgba(47,74,110,0.96) 0%, rgba(91,69,112,0.94) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
        }}
      >
        <div
          style={{
            color: '#FFFFFF',
            fontSize: 17,
            lineHeight: 1.3,
            marginBottom: 18,
            ...theme.fonts.Mulish_800ExtraBold,
          }}
        >
          Referral code : {effectiveReferralCode || '-'}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 10,
            marginBottom: 12,
          }}
        >
          {placementOptions.map(option => {
            const isActive = selectedPlacement === option.label;

            return (
              <button
                key={option.label}
                type='button'
                disabled={option.disabled}
                onClick={() => {
                  if (!option.disabled) {
                    setSelectedPlacement(option.label);
                  }
                }}
                style={{
                  height: 44,
                  borderRadius: 0,
                  cursor: option.disabled ? 'not-allowed' : 'pointer',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backgroundColor: isActive ? '#86F7B1' : 'rgba(255,255,255,0.03)',
                  color: isActive ? '#101828' : 'rgba(255,255,255,0.72)',
                  opacity: option.disabled ? 0.5 : 1,
                  fontSize: option.shortLabel === 'AUTO' ? 16 : 18,
                  letterSpacing: 0.6,
                  ...theme.fonts.Mulish_800ExtraBold,
                }}
                title={option.label}
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.9fr)',
            gap: 12,
          }}
        >
          <button
            onClick={handleCopyReferralLink}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              height: 48,
              borderRadius: 0,
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              ...theme.fonts.Mulish_800ExtraBold,
            }}
            title='Copy'
          >
            Copy
          </button>
          <button
            onClick={handleShareReferralLink}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              height: 48,
              borderRadius: 0,
              cursor: 'pointer',
              backgroundColor: 'rgba(255,255,255,0.04)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              ...theme.fonts.Mulish_800ExtraBold,
            }}
            title='Share'
          >
            Share
          </button>
        </div>
        <div
          style={{
            marginTop: 14,
            color: 'rgba(255,255,255,0.82)',
            fontSize: 12,
            lineHeight: 1.6,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          {helperText}
        </div>
        {copyMessage ? (
          <div
            style={{
              marginTop: 8,
              color: copyMessage.includes('ไม่สำเร็จ')
                ? '#FCA5A5'
                : '#A7F3D0',
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

  const renderContent = () => {
    return (
      <div style={{paddingTop: 40, paddingBottom: 64 + 30}}>
        {renderUserInfo()}
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
