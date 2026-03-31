import axios from 'axios';
import {FC, useEffect, useMemo, useState} from 'react';
import {useLocation} from 'react-router-dom';

import {URLS} from '../config';
import {hooks} from '../hooks';
import {custom} from '../custom';
import {theme} from '../constants';
import {components} from '../components';
import {actions} from '../store/actions';
import {
  buildSignUpPath,
  buildLineLiffEntryUrl,
  extractSponsorCodeFromSearch,
  initializeLineLiff,
  normalizeSponsorCode,
} from '../utils/line';

type CreatedMemberResponse = {
  memberId: string;
  memberCode: string;
  temporaryPassword?: string;
  name?: string;
};

type LoginResponse = {
  accessToken: string;
  user?: {
    userId?: string;
    memberCode?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
};

type LocationState = {
  sponsorCode?: string;
};

type SignupShareSettingsResponse = {
  shareMessage?: string;
};
type MemberSummaryResponse = {
  memberCode?: string;
  name?: string;
};

const DEFAULT_SHARE_MESSAGE =
  'ส่งข้อมูลนี้เก็บไว้สำหรับเข้าใช้งานครั้งแรก และเปลี่ยนรหัสผ่านหลังเข้าสู่ระบบทันที';

const renderHeader = (): JSX.Element => {
  return <components.Header goBack={true} />;
};

export const SignUp: FC = (): JSX.Element => {
  const navigate = hooks.useAppNavigate();
  const dispatch = hooks.useAppDispatch();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdAccount, setCreatedAccount] = useState<{
    memberCode: string;
    password: string;
  } | null>(null);
  const [shareMessage, setShareMessage] = useState(DEFAULT_SHARE_MESSAGE);
  const [shareStatus, setShareStatus] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [lineIdToken, setLineIdToken] = useState('');
  const [lineDisplayName, setLineDisplayName] = useState('');
  const [linePictureUrl, setLinePictureUrl] = useState('');
  const [lineStatus, setLineStatus] = useState('');

  const sponsorCode = useMemo(() => {
    const state = (location.state || {}) as LocationState;

    return normalizeSponsorCode(
      extractSponsorCodeFromSearch(location.search) || state.sponsorCode || '',
    );
  }, [location.search, location.state]);

  useEffect(() => {
    let mounted = true;

    const loadSponsor = async () => {
      if (!sponsorCode) {
        setSponsorName('');
        return;
      }

      try {
        const response = await axios.get<MemberSummaryResponse>(
          URLS.buildMemberByCodeUrl(sponsorCode),
          {
            withCredentials: true,
          },
        );

        if (mounted) {
          setSponsorName(response.data.name?.trim() || '');
        }
      } catch (error) {
        if (mounted) {
          setSponsorName('');
        }
        console.error(error);
      }
    };

    loadSponsor().catch(console.error);

    return () => {
      mounted = false;
    };
  }, [sponsorCode]);

  useEffect(() => {
    let mounted = true;

    const bootstrapLine = async () => {
      const result = await initializeLineLiff();

      if (!mounted) {
        return;
      }

      if (result.profile?.displayName) {
        setLineUserId(result.profile.userId);
        setLineIdToken(result.profile.idToken || '');
        setLineDisplayName(result.profile.displayName);
        setLinePictureUrl(result.profile.pictureUrl || '');
        setLineStatus(`ดึงชื่อจาก LINE ได้แล้ว: ${result.profile.displayName}`);
        return;
      }

      if (result.errorMessage) {
        setLineStatus(result.errorMessage);
      }
    };

    bootstrapLine().catch(error => {
      if (mounted) {
        setLineStatus(
          error instanceof Error ? error.message : 'LIFF bootstrap failed.',
        );
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const shareText = useMemo(() => {
    if (!createdAccount) {
      return '';
    }

    return [
      shareMessage,
      `รหัสสมาชิก: ${createdAccount.memberCode}`,
      `พาสเวิร์ด: ${createdAccount.password}`,
    ]
      .filter(Boolean)
      .join('\n');
  }, [createdAccount, shareMessage]);

  const handleCreateAccount = async (): Promise<void> => {
    if (!sponsorCode) {
      setErrorMessage('ไม่พบรหัสผู้แนะนำจากลิงก์สมัครสมาชิก');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const createResponse = await axios.post<CreatedMemberResponse>(
        `${URLS.API_BASE_URL}/members`,
        {
          sponsorCode,
          name: lineDisplayName || undefined,
        },
        {
          withCredentials: true,
        },
      );

      const createdMemberCode = createResponse.data.memberCode?.trim();
      const createdPassword = createResponse.data.temporaryPassword?.trim();

      if (!createdMemberCode || !createdPassword) {
        throw new Error('ระบบไม่สามารถสร้างรหัสสมาชิกหรือพาสเวิร์ดชั่วคราวได้');
      }

      const loginResponse = await axios.post<LoginResponse>(
        URLS.AUTH_LOGIN,
        {
          identifier: createdMemberCode,
          password: createdPassword,
        },
        {
          withCredentials: true,
        },
      );

      if (lineUserId) {
        await axios.post(
          URLS.AUTH_LINE_BINDING,
            {
              lineUserId,
              lineIdToken: lineIdToken || undefined,
              displayName: lineDisplayName || undefined,
            pictureUrl: linePictureUrl || undefined,
            source: 'line_invite_signup',
          },
          {
            headers: {
              Authorization: `Bearer ${loginResponse.data.accessToken}`,
            },
          },
        );
      }

      dispatch(
        actions.setUser({
          userId: loginResponse.data.user?.userId,
          memberCode: loginResponse.data.user?.memberCode || createdMemberCode,
          name: loginResponse.data.user?.name || lineDisplayName || createdMemberCode,
          lineUserId: lineUserId || undefined,
          lineDisplayName: lineDisplayName || undefined,
          linePictureUrl: linePictureUrl || undefined,
          email: loginResponse.data.user?.email ?? '',
          phone: loginResponse.data.user?.phone ?? '',
          accessToken: loginResponse.data.accessToken,
        }),
      );
      dispatch(actions.setRememberMe(true));

      setCreatedAccount({
        memberCode: createdMemberCode,
        password: createdPassword,
      });
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');

      try {
        const shareSettingsResponse = await axios.get<SignupShareSettingsResponse>(
          URLS.GET_SIGNUP_SHARE_SETTINGS,
          {
            withCredentials: true,
          },
        );
        setShareMessage(
          shareSettingsResponse.data.shareMessage?.trim() || DEFAULT_SHARE_MESSAGE,
        );
      } catch (shareSettingsError) {
        console.error(shareSettingsError);
        setShareMessage(DEFAULT_SHARE_MESSAGE);
      }
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || error?.message || 'ไม่สามารถสมัครสมาชิกได้',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShareCredentials = async (): Promise<void> => {
    if (!shareText) {
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Stephub member credentials',
          text: shareText,
        });
        setShareStatus('เปิดหน้าต่างแชร์แล้ว');
      } else {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('คัดลอกข้อมูลสำหรับแชร์แล้ว');
      }
    } catch (error) {
      console.error(error);
      setShareStatus('แชร์ข้อมูลไม่สำเร็จ');
    } finally {
      window.setTimeout(() => setShareStatus(''), 2000);
    }
  };

  const handleChangePassword = async (): Promise<void> => {
    if (!createdAccount) {
      return;
    }

    const nextPassword = newPassword.trim();
    const confirmedPassword = confirmPassword.trim();

    if (nextPassword.length < 6) {
      setShareStatus('พาสเวิร์ดใหม่ต้องมีอย่างน้อย 6 ตัว');
      window.setTimeout(() => setShareStatus(''), 2000);
      return;
    }

    if (nextPassword !== confirmedPassword) {
      setShareStatus('ยืนยันพาสเวิร์ดใหม่ไม่ตรงกัน');
      window.setTimeout(() => setShareStatus(''), 2000);
      return;
    }

    if (!createdAccount.password.trim()) {
      setShareStatus('ไม่พบพาสเวิร์ดปัจจุบันสำหรับเปลี่ยนรหัสผ่าน');
      window.setTimeout(() => setShareStatus(''), 2000);
      return;
    }

    setChangingPassword(true);
    try {
      await axios.post(
        URLS.AUTH_CHANGE_PASSWORD,
        {
          currentPassword: createdAccount.password,
          newPassword: nextPassword,
        },
        {
          withCredentials: true,
        },
      );

      setCreatedAccount({
        ...createdAccount,
        password: nextPassword,
      });
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setShareStatus('เปลี่ยนพาสเวิร์ดเรียบร้อยแล้ว');
      window.setTimeout(() => setShareStatus(''), 2000);
    } catch (error: any) {
      console.error(error);
      setShareStatus(
        error?.response?.data?.message || 'เปลี่ยนพาสเวิร์ดไม่สำเร็จ',
      );
      window.setTimeout(() => setShareStatus(''), 2000);
    } finally {
      setChangingPassword(false);
    }
  };

  const renderPopup = (): JSX.Element | null => {
    if (!createdAccount) {
      return null;
    }

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.48)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 24,
            backgroundColor: '#fff',
            padding: 24,
            boxShadow: '0 24px 64px rgba(15, 23, 42, 0.18)',
          }}
        >
          <h2
            style={{
              margin: '0 0 12px 0',
              fontSize: 26,
              color: theme.colors.mainColor,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            สมัครสำเร็จ
          </h2>
          <p
            style={{
              margin: '0 0 18px 0',
              lineHeight: 1.7,
              color: theme.colors.textColor,
            }}
          >
            กรุณาบันทึกรหัสสมาชิกและพาสเวิร์ดนี้ไว้ก่อนใช้งาน
          </p>
          <div
            style={{
              borderRadius: 18,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: 18,
              marginBottom: 18,
            }}
          >
            <div style={{marginBottom: 12}}>
              <div style={{fontSize: 12, color: '#64748B', marginBottom: 4}}>
                รหัสสมาชิก
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: theme.colors.mainColor,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                {createdAccount.memberCode}
              </div>
            </div>
            <div>
              <div style={{fontSize: 12, color: '#64748B', marginBottom: 4}}>
                พาสเวิร์ด
              </div>
              <div
                style={{
                  fontSize: 22,
                  color: theme.colors.mainColor,
                  letterSpacing: 1,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                {createdAccount.password}
              </div>
            </div>
          </div>
          {shareStatus ? (
            <p
              style={{
                margin: '0 0 14px 0',
                lineHeight: 1.6,
                color: shareStatus.includes('ไม่') ? theme.colors.coralRed : '#0F766E',
              }}
            >
              {shareStatus}
            </p>
          ) : null}
          <div
            style={{
              display: 'grid',
              gap: 10,
              gridTemplateColumns: '1fr 1fr',
              marginBottom: 14,
            }}
          >
            <button
              onClick={handleShareCredentials}
              style={{
                border: '1px solid #D7E2F2',
                borderRadius: 12,
                backgroundColor: '#fff',
                color: theme.colors.mainColor,
                padding: '12px 14px',
                fontSize: 15,
              }}
            >
              แชร์ข้อมูล
            </button>
            <button
              onClick={() => setShowChangePassword(current => !current)}
              style={{
                border: '1px solid #D7E2F2',
                borderRadius: 12,
                backgroundColor: '#fff',
                color: theme.colors.mainColor,
                padding: '12px 14px',
                fontSize: 15,
              }}
            >
              เปลี่ยนพาสเวิร์ด
            </button>
          </div>
          {showChangePassword ? (
            <div
              style={{
                borderRadius: 18,
                border: '1px solid #E2E8F0',
                padding: 16,
                marginBottom: 14,
              }}
            >
              <custom.InputField
                label='พาสเวิร์ดใหม่'
                type='password'
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
                containerStyle={{marginBottom: 14}}
                placeholder='อย่างน้อย 6 ตัว'
              />
              <custom.InputField
                label='ยืนยันพาสเวิร์ดใหม่'
                type='password'
                value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)}
                containerStyle={{marginBottom: 14}}
                placeholder='กรอกอีกครั้ง'
              />
              <components.Button
                title={changingPassword ? 'กำลังเปลี่ยน...' : 'บันทึกพาสเวิร์ดใหม่'}
                onClick={handleChangePassword}
              />
            </div>
          ) : null}
          <components.Button
            title='ไปกรอกข้อมูลเพิ่มเติม'
            onClick={() =>
              navigate('/EditProfile', {
                state: {
                  memberCode: createdAccount.memberCode,
                },
              })
            }
          />
        </div>
      </div>
    );
  };

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
            marginBottom: 14,
          }}
        >
          Sign up
        </h1>
        <p
          style={{
            margin: '0 0 28px 0',
            textAlign: 'center',
            color: theme.colors.textColor,
            lineHeight: 1.7,
          }}
        >
          สมัครสมาชิกผ่านรหัสผู้แนะนำจากลิงก์นี้ ระบบจะสร้างรหัสสมาชิกและพาสเวิร์ดให้โดยอัตโนมัติ
        </p>
        {sponsorName ? (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 14,
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              padding: '14px 16px',
              color: theme.colors.textColor,
              lineHeight: 1.6,
            }}
          >
            ผู้แนะนำ: <strong>{sponsorName}</strong> ({sponsorCode})
          </div>
        ) : null}
        {lineStatus ? (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 14,
              backgroundColor: lineUserId ? '#F0FDF4' : '#FFF7ED',
              border: lineUserId ? '1px solid #C7E8CF' : '1px solid #FED7AA',
              padding: '14px 16px',
              color: lineUserId ? '#166534' : '#9A3412',
              lineHeight: 1.6,
            }}
          >
            {lineStatus}
            <div style={{marginTop: 6, fontSize: 12, opacity: 0.9}}>
              {lineUserId
                ? 'ระบบจะใช้ชื่อจาก LINE มาช่วยกรอกตอนสร้างสมาชิก และจะเชื่อม LINE ให้หลังสมัครสำเร็จ'
                : 'ถ้า LIFF ยังไม่พร้อม ให้กลับไปเปิดลิงก์สมัครจาก LINE อีกครั้ง หรือใช้ลิงก์ invite เดิมซ้ำเพื่อให้ระบบดึง LINE profile ใหม่'}
            </div>
          </div>
        ) : null}
        <custom.InputField
          label='รหัสผู้แนะนำ'
          value={sponsorCode}
          disabled={true}
          containerStyle={{marginBottom: 20, backgroundColor: '#F8FAFC'}}
        />
        <custom.InputField
          label='ชื่อจาก LINE'
          value={lineDisplayName || 'ยังไม่ได้เชื่อม LINE profile'}
          disabled={true}
          containerStyle={{marginBottom: 20, backgroundColor: '#F8FAFC'}}
        />
        {!lineUserId ? (
          <div
            style={{
              margin: '0 0 20px 0',
              borderRadius: 14,
              backgroundColor: '#FFF7ED',
              border: '1px solid #FED7AA',
              padding: '14px 16px',
              color: '#9A3412',
              lineHeight: 1.7,
            }}
          >
            ถ้ายังไม่เห็นชื่อจาก LINE ให้กลับไปเปิดลิงก์สมัครผ่าน LINE อีกครั้ง เพื่อให้ระบบเชื่อมบัญชีก่อนสมัคร
            <div style={{marginTop: 10}}>
              <button
                onClick={() =>
                  window.location.assign(
                    buildLineLiffEntryUrl({
                      sponsorCode,
                      mode: 'signup',
                      returnTo: buildSignUpPath(sponsorCode),
                    }),
                  )
                }
                style={{
                  border: 'none',
                  borderRadius: 10,
                  backgroundColor: '#EA580C',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  cursor: 'pointer',
                }}
              >
                เปิดผ่าน LINE อีกครั้ง
              </button>
            </div>
          </div>
        ) : null}
        {errorMessage ? (
          <p
            style={{
              margin: '0 0 20px 0',
              color: theme.colors.coralRed,
              lineHeight: 1.7,
            }}
          >
            {errorMessage}
          </p>
        ) : null}
        <components.Button
          title={loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          onClick={handleCreateAccount}
          style={{marginBottom: 16}}
        />
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: 14,
            border: '1px solid #D7E2F2',
            backgroundColor: '#fff',
            color: theme.colors.mainColor,
            fontSize: 16,
          }}
        >
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
      {renderPopup()}
    </>
  );
};
