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

type DashboardResponse = {
  referral?: {
    memberCode?: string;
    sponsorCode?: string;
    referralCode?: string;
    referralLink?: string;
  };
};

type ReferralResponse = {
  memberCode?: string;
  sponsorCode?: string;
  referralCode?: string;
  referralLink?: string;
};

const DEFAULT_REFERRAL_MEMBER_CODE = 'TH0000013';
const COMPANY_LOGO_FALLBACK = `${URLS.BAO_BASE_URL}/favicon.ico`;

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
}) => {
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

  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const [referralLink, setReferralLink] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
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
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
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

  const renderContent = () => {
    return (
      <div style={{paddingTop: 40, paddingBottom: 64 + 30}}>
        {renderUserInfo()}
        {renderReferralCard()}
        {renderMenu()}
      </div>
    );
  };

  const renderBottomTabBar = () => {
    return <components.BottomTabBar />;
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
      {renderBottomTabBar()}
    </>
  );
};
