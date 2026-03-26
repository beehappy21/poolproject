import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';

import {URLS} from '../config';
import {theme} from '../constants';
import {components} from '../components';
import {hooks} from '../hooks';
import {RootState} from '../store';

type KycRequestSummary = {
  requestId: string;
  userId: string;
  memberCode: string;
  memberName: string;
  nationalId: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankAccountType: string | null;
  personalIdImageUrl: string | null;
  bankBookImageUrl: string | null;
  selfieImageUrl: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt: string | null;
  approvedByUserId: string | null;
  rejectionReason: string | null;
};

const MAX_KYC_IMAGE_DIMENSION = 1600;
const KYC_IMAGE_OUTPUT_QUALITY = 0.82;

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load selected image.'));
    image.src = dataUrl;
  });
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read selected image.'));
    };
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
};

const resizeKycImage = async (file: File): Promise<string> => {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const scale = Math.min(
    1,
    MAX_KYC_IMAGE_DIMENSION / Math.max(image.width, image.height),
  );
  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    return sourceDataUrl;
  }

  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', KYC_IMAGE_OUTPUT_QUALITY);
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 48,
  borderRadius: 12,
  border: `1px solid ${theme.colors.aliceBlue2}`,
  padding: '12px 14px',
  color: theme.colors.mainColor,
  backgroundColor: theme.colors.white,
  ...theme.fonts.Mulish_400Regular,
};

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 108,
  resize: 'vertical',
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getStatusMeta = (status: KycRequestSummary['status']) => {
  if (status === 'approved') {
    return {
      label: 'อนุมัติแล้ว',
      color: '#166534',
      backgroundColor: '#DCFCE7',
    };
  }

  if (status === 'rejected') {
    return {
      label: 'ไม่ผ่าน',
      color: '#B91C1C',
      backgroundColor: '#FEE2E2',
    };
  }

  return {
    label: 'รอตรวจสอบ',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
  };
};

export const Kyc: React.FC = () => {
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<KycRequestSummary[]>([]);
  const [nationalId, setNationalId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountType, setBankAccountType] = useState('');
  const [personalIdImageUrl, setPersonalIdImageUrl] = useState('');
  const [bankBookImageUrl, setBankBookImageUrl] = useState('');
  const [selfieImageUrl, setSelfieImageUrl] = useState('');
  const [personalIdFileName, setPersonalIdFileName] = useState('');
  const [bankBookFileName, setBankBookFileName] = useState('');
  const [selfieFileName, setSelfieFileName] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const latestRequest = useMemo(() => requests[0], [requests]);

  const loadRequests = async () => {
    if (!user?.accessToken) {
      setLoading(false);
      setErrorMessage('ต้องมี session ก่อนจึงจะส่งคำขอ KYC ได้');
      return;
    }

    try {
      const response = await axios.get<KycRequestSummary[]>(URLS.AUTH_KYC_REQUESTS, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });

      const nextRequests = Array.isArray(response.data) ? response.data : [];
      setRequests(nextRequests);

      const seedRequest = nextRequests[0];
      setNationalId(seedRequest?.nationalId || '');
      setBankName(seedRequest?.bankName || '');
      setBankBranch(seedRequest?.bankBranch || '');
      setBankAccountNumber(seedRequest?.bankAccountNumber || '');
      setBankAccountName(seedRequest?.bankAccountName || user?.name || '');
      setBankAccountType(seedRequest?.bankAccountType || '');
      setPersonalIdImageUrl(seedRequest?.personalIdImageUrl || '');
      setBankBookImageUrl(seedRequest?.bankBookImageUrl || '');
      setSelfieImageUrl(seedRequest?.selfieImageUrl || '');
      setPersonalIdFileName('');
      setBankBookFileName('');
      setSelfieFileName('');
      setNote(seedRequest?.note || '');
    } catch (error) {
      console.error(error);
      setErrorMessage('ไม่สามารถโหลดข้อมูล KYC ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken]);

  const handleSubmit = async () => {
    if (!user?.accessToken) {
      setErrorMessage('ต้องมี session ก่อนจึงจะส่งคำขอ KYC ได้');
      return;
    }

    if (!nationalId.trim()) {
      setErrorMessage('กรุณากรอกเลขบัตรประชาชน');
      return;
    }

    if (!personalIdImageUrl.trim() || !bankBookImageUrl.trim() || !selfieImageUrl.trim()) {
      setErrorMessage('กรุณากรอกลิงก์รูปเอกสารให้ครบทั้ง 3 รายการ');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setMessage('');

    try {
      await axios.post(
        URLS.AUTH_KYC_REQUESTS,
        {
          nationalId: nationalId.trim(),
          bankName: bankName.trim() || undefined,
          bankBranch: bankBranch.trim() || undefined,
          bankAccountNumber: bankAccountNumber.trim() || undefined,
          bankAccountName: bankAccountName.trim() || undefined,
          bankAccountType: bankAccountType.trim() || undefined,
          personalIdImageUrl: personalIdImageUrl.trim(),
          bankBookImageUrl: bankBookImageUrl.trim(),
          selfieImageUrl: selfieImageUrl.trim(),
          note: note.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      setMessage('ส่งคำขอ KYC เรียบร้อยแล้ว ระบบจะส่งให้ admin ตรวจสอบต่อ');
      await loadRequests();
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'ไม่สามารถส่งคำขอ KYC ได้ในขณะนี้',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (
    file: File | undefined,
    target: 'personal' | 'bankBook' | 'selfie',
  ) => {
    if (!file) {
      return;
    }

    setErrorMessage('');

    try {
      const result = await resizeKycImage(file);

      if (target === 'personal') {
        setPersonalIdImageUrl(result);
        setPersonalIdFileName(file.name);
        return;
      }

      if (target === 'bankBook') {
        setBankBookImageUrl(result);
        setBankBookFileName(file.name);
        return;
      }

      setSelfieImageUrl(result);
      setSelfieFileName(file.name);
    } catch (error) {
      console.error(error);
      setErrorMessage('ไม่สามารถเตรียมรูปเอกสารได้ในขณะนี้');
    }
  };

  return (
    <>
      <components.Header goBack={true} />
      <main style={{padding: '20px 20px 120px', minHeight: 'calc(100vh - 72px)'}}>
        <section
          style={{
            padding: 20,
            borderRadius: 18,
            backgroundColor: '#F4F7FB',
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              color: theme.colors.mainColor,
              fontSize: 24,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            KYC / ยืนยันตัวตน
          </h2>
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              lineHeight: 1.7,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            ส่งข้อมูลและลิงก์รูปเอกสารเพื่อให้ admin ตรวจสอบตัวตนและบัญชีธนาคารก่อนใช้งานฟังก์ชันที่เกี่ยวข้อง
          </p>
        </section>

        <section
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: 18,
            border: `1px solid ${theme.colors.aliceBlue2}`,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: theme.colors.mainColor,
                fontSize: 18,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              สถานะล่าสุด
            </h3>
            {latestRequest ? (
              <span
                style={{
                  display: 'inline-flex',
                  padding: '6px 10px',
                  borderRadius: 999,
                  backgroundColor: getStatusMeta(latestRequest.status).backgroundColor,
                  color: getStatusMeta(latestRequest.status).color,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                {getStatusMeta(latestRequest.status).label}
              </span>
            ) : null}
          </div>

          <p
            style={{
              margin: '0 0 6px',
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            สมาชิก: {user?.memberCode || '-'}
          </p>
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            คำขอล่าสุด: {latestRequest ? formatDateTime(latestRequest.submittedAt) : 'ยังไม่มีคำขอ'}
          </p>
          {latestRequest?.rejectionReason ? (
            <p
              style={{
                margin: '12px 0 0',
                color: theme.colors.coralRed,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              เหตุผลที่ไม่ผ่าน: {latestRequest.rejectionReason}
            </p>
          ) : null}
        </section>

        <section
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: 18,
            border: `1px solid ${theme.colors.aliceBlue2}`,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              color: theme.colors.mainColor,
              fontSize: 18,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            ส่งคำขอใหม่
          </h3>

          <div style={{display: 'grid', gap: 14}}>
            <input value={nationalId} onChange={event => setNationalId(event.target.value)} placeholder='เลขบัตรประชาชน' style={inputStyle} />
            <input value={bankName} onChange={event => setBankName(event.target.value)} placeholder='ธนาคาร' style={inputStyle} />
            <input value={bankBranch} onChange={event => setBankBranch(event.target.value)} placeholder='สาขา' style={inputStyle} />
            <input value={bankAccountName} onChange={event => setBankAccountName(event.target.value)} placeholder='ชื่อบัญชี' style={inputStyle} />
            <input value={bankAccountNumber} onChange={event => setBankAccountNumber(event.target.value)} placeholder='เลขบัญชี' style={inputStyle} />
            <input value={bankAccountType} onChange={event => setBankAccountType(event.target.value)} placeholder='ประเภทบัญชี เช่น savings / current' style={inputStyle} />
            <label
              style={{
                display: 'grid',
                gap: 10,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              รูปบัตรประชาชน
              <input
                type='file'
                accept='image/*'
                onChange={event => {
                  void handleFileChange(event.target.files?.[0], 'personal');
                  event.target.value = '';
                }}
                style={{display: 'none'}}
              />
              <span
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {personalIdFileName || personalIdImageUrl ? personalIdFileName || 'เลือกรูปแล้ว' : 'เลือกภาพบัตรประชาชน'}
              </span>
              {personalIdImageUrl ? (
                <img
                  src={personalIdImageUrl}
                  alt='Personal ID preview'
                  style={{
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'contain',
                    borderRadius: 12,
                    backgroundColor: theme.colors.white,
                    border: '1px solid #E8EFF4',
                  }}
                />
              ) : null}
            </label>
            <label
              style={{
                display: 'grid',
                gap: 10,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              รูปหน้าสมุดบัญชี
              <input
                type='file'
                accept='image/*'
                onChange={event => {
                  void handleFileChange(event.target.files?.[0], 'bankBook');
                  event.target.value = '';
                }}
                style={{display: 'none'}}
              />
              <span
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {bankBookFileName || bankBookImageUrl ? bankBookFileName || 'เลือกรูปแล้ว' : 'เลือกภาพสมุดบัญชี'}
              </span>
              {bankBookImageUrl ? (
                <img
                  src={bankBookImageUrl}
                  alt='Bank book preview'
                  style={{
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'contain',
                    borderRadius: 12,
                    backgroundColor: theme.colors.white,
                    border: '1px solid #E8EFF4',
                  }}
                />
              ) : null}
            </label>
            <label
              style={{
                display: 'grid',
                gap: 10,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              รูปถ่ายตนเอง
              <input
                type='file'
                accept='image/*'
                onChange={event => {
                  void handleFileChange(event.target.files?.[0], 'selfie');
                  event.target.value = '';
                }}
                style={{display: 'none'}}
              />
              <span
                style={{
                  ...inputStyle,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                {selfieFileName || selfieImageUrl ? selfieFileName || 'เลือกรูปแล้ว' : 'เลือกรูปถ่ายตนเอง'}
              </span>
              {selfieImageUrl ? (
                <img
                  src={selfieImageUrl}
                  alt='Selfie preview'
                  style={{
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'contain',
                    borderRadius: 12,
                    backgroundColor: theme.colors.white,
                    border: '1px solid #E8EFF4',
                  }}
                />
              ) : null}
            </label>
            <textarea value={note} onChange={event => setNote(event.target.value)} placeholder='หมายเหตุเพิ่มเติม' style={textAreaStyle} />
          </div>

          {errorMessage ? (
            <p style={{margin: '14px 0 0', color: theme.colors.coralRed, ...theme.fonts.Mulish_400Regular}}>
              {errorMessage}
            </p>
          ) : null}

          {message ? (
            <p style={{margin: '14px 0 0', color: '#15803D', ...theme.fonts.Mulish_400Regular}}>
              {message}
            </p>
          ) : null}

          <button
            onClick={handleSubmit}
            disabled={loading || submitting}
            style={{
              marginTop: 18,
              width: '100%',
              height: 50,
              border: 'none',
              borderRadius: 14,
              cursor: loading || submitting ? 'not-allowed' : 'pointer',
              backgroundColor: theme.colors.mainColor,
              color: theme.colors.mainYellow,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอ KYC'}
          </button>
        </section>

        <section
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: 18,
            border: `1px solid ${theme.colors.aliceBlue2}`,
            padding: 20,
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              color: theme.colors.mainColor,
              fontSize: 18,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            ประวัติคำขอ
          </h3>

          {loading ? (
            <p style={{margin: 0, color: theme.colors.textColor, ...theme.fonts.Mulish_400Regular}}>
              กำลังโหลดข้อมูล...
            </p>
          ) : requests.length === 0 ? (
            <p style={{margin: 0, color: theme.colors.textColor, ...theme.fonts.Mulish_400Regular}}>
              ยังไม่มีคำขอ KYC ในระบบ
            </p>
          ) : (
            <div style={{display: 'grid', gap: 14}}>
              {requests.map(request => {
                const statusMeta = getStatusMeta(request.status);

                return (
                  <div
                    key={request.requestId}
                    style={{
                      border: `1px solid ${theme.colors.aliceBlue2}`,
                      borderRadius: 14,
                      padding: 16,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                        คำขอ #{request.requestId}
                      </strong>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '6px 10px',
                          borderRadius: 999,
                          backgroundColor: statusMeta.backgroundColor,
                          color: statusMeta.color,
                          ...theme.fonts.Mulish_700Bold,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div
                      style={{
                        color: theme.colors.textColor,
                        lineHeight: 1.6,
                        ...theme.fonts.Mulish_400Regular,
                      }}
                    >
                      <div>ส่งคำขอ: {formatDateTime(request.submittedAt)}</div>
                      <div>เลขบัตร: {request.nationalId || '-'}</div>
                      <div>
                        บัญชี: {request.bankAccountName || '-'} / {request.bankName || '-'} / {request.bankAccountNumber || '-'}
                      </div>
                      <div>
                        เอกสาร:{' '}
                        {[request.personalIdImageUrl, request.bankBookImageUrl, request.selfieImageUrl]
                          .filter(Boolean)
                          .map((url, index) => (
                            <a
                              key={`${request.requestId}-${index}`}
                              href={url || '#'}
                              target='_blank'
                              rel='noreferrer'
                              style={{
                                marginRight: 10,
                                color: theme.colors.mainColor,
                                textDecoration: 'underline',
                              }}
                            >
                              เปิดรูป {index + 1}
                            </a>
                          ))}
                      </div>
                      {request.rejectionReason ? (
                        <div style={{color: theme.colors.coralRed}}>
                          เหตุผลที่ไม่ผ่าน: {request.rejectionReason}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
};
