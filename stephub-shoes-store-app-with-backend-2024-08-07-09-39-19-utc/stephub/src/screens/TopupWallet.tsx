import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';

import {URLS} from '../config';
import {theme} from '../constants';
import {components} from '../components';
import {hooks} from '../hooks';
import {RootState} from '../store';

type DashboardResponse = {
  wallet?: {
    shoppingBalance?: string;
  };
};

type PaymentInstructionsResponse = {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  promptPayNumber?: string;
  note?: string;
};

type WalletTopupRequestSummary = {
  requestId: string;
  amount: string;
  paymentMethod: string;
  transferSlipUrl: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
};

const MAX_SLIP_IMAGE_DIMENSION = 1600;
const SLIP_IMAGE_OUTPUT_QUALITY = 0.82;

const parseDecimal = (value?: string | null) => {
  const parsed = Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

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

const resizeSlipImage = async (file: File): Promise<string> => {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const scale = Math.min(
    1,
    MAX_SLIP_IMAGE_DIMENSION / Math.max(image.width, image.height),
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

  return canvas.toDataURL('image/jpeg', SLIP_IMAGE_OUTPUT_QUALITY);
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

const sectionCardStyle: React.CSSProperties = {
  backgroundColor: theme.colors.white,
  borderRadius: 24,
  border: `1px solid ${theme.colors.aliceBlue2}`,
  padding: 20,
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
};

const sectionLabelStyle: React.CSSProperties = {
  margin: '0 0 8px',
  color: '#64748B',
  fontSize: 13,
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  ...theme.fonts.Mulish_700Bold,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: theme.colors.mainColor,
  fontSize: 24,
  ...theme.fonts.Mulish_700Bold,
};

const getStatusMeta = (status: WalletTopupRequestSummary['status']) => {
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

  if (status === 'cancelled') {
    return {
      label: 'ยกเลิก',
      color: '#475569',
      backgroundColor: '#E2E8F0',
    };
  }

  return {
    label: 'รอตรวจสอบ',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
  };
};

const getPaymentMethodLabel = (paymentMethod: string) => {
  if (paymentMethod === 'promptpay') {
    return 'PromptPay';
  }

  if (paymentMethod === 'cash') {
    return 'Cash';
  }

  if (paymentMethod === 'manual_bank') {
    return 'Manual bank';
  }

  return 'Bank transfer';
};

export const TopupWallet: React.FC = () => {
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shoppingBalance, setShoppingBalance] = useState(0);
  const [instructions, setInstructions] = useState<PaymentInstructionsResponse>({});
  const [requests, setRequests] = useState<WalletTopupRequestSummary[]>([]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transferSlipUrl, setTransferSlipUrl] = useState('');
  const [slipFileName, setSlipFileName] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const latestRequest = useMemo(() => requests[0], [requests]);

  const loadPage = async () => {
    if (!user?.accessToken) {
      setLoading(false);
      setErrorMessage('ต้องมี session ก่อนจึงจะส่งคำขอเติม wallet ได้');
      return;
    }

    try {
      const authRequestConfig = {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      };
      const [dashboardResponse, instructionsResponse, requestsResponse] = await Promise.all([
        axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, authRequestConfig),
        axios.get<PaymentInstructionsResponse>(URLS.AUTH_PAYMENT_INSTRUCTIONS, authRequestConfig),
        axios.get<WalletTopupRequestSummary[]>(URLS.AUTH_WALLET_TOPUP_REQUESTS, authRequestConfig),
      ]);

      setShoppingBalance(parseDecimal(dashboardResponse.data.wallet?.shoppingBalance));
      setInstructions(instructionsResponse.data || {});
      setRequests(Array.isArray(requestsResponse.data) ? requestsResponse.data : []);
    } catch (error) {
      console.error(error);
      setErrorMessage('ไม่สามารถโหลดข้อมูลเติม wallet ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken]);

  useEffect(() => {
    const handleRefresh = () => {
      if (!document.hidden) {
        loadPage();
      }
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken]);

  const handleSlipFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const result = await resizeSlipImage(file);
      setTransferSlipUrl(result);
      setSlipFileName(file.name);
      setErrorMessage('');
    } catch (error) {
      console.error(error);
      setErrorMessage('ไม่สามารถเตรียมรูปสลิปได้');
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!user?.accessToken) {
      setErrorMessage('ต้องมี session ก่อนจึงจะส่งคำขอเติม wallet ได้');
      return;
    }

    const amountNumber = parseDecimal(amount);

    if (amountNumber <= 0) {
      setErrorMessage('กรุณาระบุยอดที่ต้องการเติม');
      return;
    }

    if (!transferSlipUrl.trim()) {
      setErrorMessage('กรุณาแนบสลิปหรือกรอกลิงก์สลิป');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setMessage('');

    try {
      await axios.post(
        URLS.AUTH_WALLET_TOPUP_REQUESTS,
        {
          amount: amountNumber.toFixed(2),
          paymentMethod,
          transferSlipUrl: transferSlipUrl.trim(),
          note: note.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      setAmount('');
      setPaymentMethod('bank_transfer');
      setTransferSlipUrl('');
      setSlipFileName('');
      setNote('');
      setMessage('ส่งคำขอเติม wallet ให้ admin ตรวจสอบสลิปแล้ว');
      await loadPage();
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'ไม่สามารถส่งคำขอเติม wallet ได้ในขณะนี้',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <components.Header title='เติม Wallet' goBack={true} />
      <main
        style={{
          padding: '20px 20px 120px',
          minHeight: 'calc(100vh - 72px)',
          background:
            'linear-gradient(180deg, #F7FAFF 0%, #F2F6FB 240px, #FFFFFF 240px)',
        }}
      >
        <section
          style={{
            ...sectionCardStyle,
            padding: 24,
            marginBottom: 20,
            background:
              'linear-gradient(135deg, #16366F 0%, #234B92 62%, #6AA5FF 160%)',
            color: theme.colors.white,
            border: 'none',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -24,
              top: -24,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }}
          />
          <p
            style={{
              margin: '0 0 10px',
              fontSize: 13,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.78)',
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            Shopping Wallet
          </p>
          <h2
            style={{
              margin: '0 0 10px',
              fontSize: 30,
              lineHeight: 1.2,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            เติม Wallet และติดตามสถานะได้ในหน้าเดียว
          </h2>
          <p
            style={{
              margin: '0 0 22px',
              maxWidth: 560,
              color: 'rgba(255,255,255,0.84)',
              lineHeight: 1.7,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            ส่งสลิปเพื่อให้ admin ตรวจสอบและเติมยอดเข้า shopping wallet ของคุณ
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
            }}
          >
            <div
              style={{
                padding: 16,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div
                style={{
                  marginBottom: 6,
                  color: 'rgba(255,255,255,0.72)',
                  ...theme.fonts.Mulish_400Regular,
                }}
              >
                ยอด SW ปัจจุบัน
              </div>
              <div style={{fontSize: 28, ...theme.fonts.Mulish_700Bold}}>
                {loading ? 'กำลังโหลด...' : formatAmount(shoppingBalance)}
              </div>
            </div>

            <div
              style={{
                padding: 16,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  marginBottom: 6,
                  color: 'rgba(255,255,255,0.72)',
                  ...theme.fonts.Mulish_400Regular,
                }}
              >
                สถานะล่าสุด
              </div>
              <div style={{fontSize: 18, ...theme.fonts.Mulish_700Bold}}>
                {latestRequest ? getStatusMeta(latestRequest.status).label : 'ยังไม่มีคำขอ'}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: 'rgba(255,255,255,0.72)',
                  ...theme.fonts.Mulish_400Regular,
                }}
              >
                {latestRequest
                  ? formatDateTime(latestRequest.requestedAt)
                  : 'พร้อมส่งคำขอใหม่ได้ทันที'}
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 18,
            marginBottom: 18,
          }}
        >
          <div style={sectionCardStyle}>
            <p style={sectionLabelStyle}>Payment guide</p>
            <p
              style={{
                margin: '0 0 10px',
                color: theme.colors.mainColor,
                fontSize: 22,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              วิธีเติมเงิน
            </p>
            <p
              style={{
                margin: '0 0 18px',
                color: theme.colors.textColor,
                lineHeight: 1.7,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              โอนตามข้อมูลด้านล่าง แล้วแนบสลิปในฟอร์มเพื่อให้ admin ตรวจสอบและอนุมัติยอดเข้า SW
            </p>

            <div
              style={{
                display: 'grid',
                gap: 12,
              }}
            >
              {[
                ['ธนาคาร', instructions.bankName || '-'],
                ['เลขบัญชี', instructions.accountNumber || '-'],
                ['ชื่อบัญชี', instructions.accountName || '-'],
                ['PromptPay', instructions.promptPayNumber || '-'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: '#F8FAFC',
                    border: `1px solid ${theme.colors.aliceBlue2}`,
                  }}
                >
                  <div
                    style={{
                      marginBottom: 4,
                      color: '#64748B',
                      fontSize: 13,
                      ...theme.fonts.Mulish_400Regular,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      color: theme.colors.mainColor,
                      wordBreak: 'break-word',
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {instructions.note ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: '#FEF7E8',
                  color: '#92400E',
                  lineHeight: 1.7,
                }}
              >
                หมายเหตุ: {instructions.note}
              </div>
            ) : null}
          </div>

          <div style={sectionCardStyle}>
            <p style={sectionLabelStyle}>New request</p>
            <h3 style={sectionTitleStyle}>ส่งคำขอเติม Wallet</h3>
            <p
              style={{
                margin: '10px 0 18px',
                color: theme.colors.textColor,
                lineHeight: 1.7,
              }}
            >
              กรอกยอด เลือกวิธีชำระ และแนบสลิปให้ครบ เพื่อให้ทีมงานตรวจสอบได้เร็วขึ้น
            </p>

            <div style={{display: 'grid', gap: 14}}>
              <input
                value={amount}
                onChange={event => setAmount(event.target.value)}
                placeholder='ยอดที่ต้องการเติม'
                inputMode='decimal'
                style={inputStyle}
              />
              <select
                value={paymentMethod}
                onChange={event => setPaymentMethod(event.target.value)}
                style={inputStyle}
              >
                <option value='bank_transfer'>Bank transfer</option>
                <option value='promptpay'>PromptPay</option>
                <option value='cash'>Cash</option>
              </select>
              <input
                value={transferSlipUrl}
                onChange={event => {
                  setTransferSlipUrl(event.target.value);
                  setSlipFileName('');
                }}
                placeholder='วางลิงก์สลิป หรือใช้ปุ่มเลือกรูปด้านล่าง'
                style={inputStyle}
              />
              <label
                style={{
                  ...inputStyle,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span>{slipFileName || 'เลือกไฟล์สลิปจากเครื่อง'}</span>
                <input
                  type='file'
                  accept='image/png,image/jpeg,image/jpg,image/webp'
                  onChange={handleSlipFileChange}
                  style={{display: 'none'}}
                />
                <span style={{color: theme.colors.mainColor}}>Upload</span>
              </label>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder='หมายเหตุเพิ่มเติม เช่น เวลาที่โอน หรือ reference'
                style={textAreaStyle}
              />
            </div>

            {transferSlipUrl ? (
              <div
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: `1px solid ${theme.colors.aliceBlue2}`,
                  padding: 12,
                  backgroundColor: '#F8FAFC',
                  marginTop: 14,
                }}
              >
                <img
                  src={transferSlipUrl}
                  alt='Slip preview'
                  style={{
                    width: '100%',
                    maxHeight: 320,
                    objectFit: 'contain',
                  }}
                />
              </div>
            ) : null}

            {message ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 14,
                  color: '#166534',
                  backgroundColor: '#DCFCE7',
                }}
              >
                {message}
              </div>
            ) : null}
            {errorMessage ? (
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 14,
                  color: '#B91C1C',
                  backgroundColor: '#FEE2E2',
                }}
              >
                {errorMessage}
              </div>
            ) : null}

            <button
              type='button'
              disabled={submitting || loading}
              onClick={handleSubmit}
              style={{
                width: '100%',
                height: 54,
                border: 'none',
                borderRadius: 16,
                marginTop: 18,
                color: theme.colors.white,
                background:
                  submitting || loading
                    ? '#94A3B8'
                    : 'linear-gradient(135deg, #16366F 0%, #234B92 100%)',
                ...theme.fonts.Mulish_700Bold,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow:
                  submitting || loading
                    ? 'none'
                    : '0 14px 30px rgba(22, 54, 111, 0.22)',
              }}
            >
              {submitting ? 'กำลังส่ง...' : 'ส่งคำขอเติม Wallet'}
            </button>
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={{marginBottom: 16}}>
            <p style={sectionLabelStyle}>Request history</p>
            <h3 style={sectionTitleStyle}>ประวัติคำขอเติม Wallet</h3>
            {latestRequest ? (
              <p style={{margin: '8px 0 0', color: theme.colors.textColor, lineHeight: 1.7}}>
                คำขอล่าสุด: {formatDateTime(latestRequest.requestedAt)}
              </p>
            ) : null}
          </div>

          {requests.length ? (
            <div style={{display: 'grid', gap: 14}}>
              {requests.map(request => {
                const statusMeta = getStatusMeta(request.status);

                return (
                  <article
                    key={request.requestId}
                    style={{
                      borderRadius: 16,
                      border: `1px solid ${theme.colors.aliceBlue2}`,
                      padding: 16,
                      backgroundColor: '#F8FAFC',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'flex-start',
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: theme.colors.mainColor,
                            fontSize: 22,
                            ...theme.fonts.Mulish_700Bold,
                          }}
                        >
                          {formatAmount(parseDecimal(request.amount))}
                        </div>
                        <div
                          style={{
                            color: theme.colors.textColor,
                            lineHeight: 1.7,
                          }}
                        >
                          {getPaymentMethodLabel(request.paymentMethod)} •{' '}
                          {formatDateTime(request.requestedAt)}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '6px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          color: statusMeta.color,
                          backgroundColor: statusMeta.backgroundColor,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 10,
                        marginBottom: request.transferSlipUrl ? 12 : 0,
                      }}
                    >
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: theme.colors.white,
                          border: `1px solid ${theme.colors.aliceBlue2}`,
                        }}
                      >
                        <div style={{color: '#64748B', fontSize: 12}}>คำขอ</div>
                        <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                          #{request.requestId}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: theme.colors.white,
                          border: `1px solid ${theme.colors.aliceBlue2}`,
                        }}
                      >
                        <div style={{color: '#64748B', fontSize: 12}}>เครดิตเข้ายอด</div>
                        <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                          {request.approvedAt ? formatDateTime(request.approvedAt) : 'รอตรวจสอบ'}
                        </div>
                      </div>
                    </div>
                    {request.transferSlipUrl ? (
                      <img
                        src={request.transferSlipUrl}
                        alt='Topup slip'
                        style={{
                          width: '100%',
                          maxHeight: 260,
                          objectFit: 'contain',
                          borderRadius: 12,
                          backgroundColor: theme.colors.white,
                          border: `1px solid ${theme.colors.aliceBlue2}`,
                          marginBottom: 12,
                        }}
                      />
                    ) : null}
                    {request.note ? (
                      <div style={{marginBottom: 8, color: theme.colors.textColor}}>
                        หมายเหตุ: {request.note}
                      </div>
                    ) : null}
                    {request.status === 'approved' ? (
                      <div style={{color: '#166534'}}>
                        เติมยอดสำเร็จแล้ว ยอดจะถูกเพิ่มใน Shopping Wallet หลัง admin อนุมัติ
                      </div>
                    ) : null}
                    {request.rejectionReason ? (
                      <div style={{color: '#B91C1C'}}>เหตุผลที่ไม่ผ่าน: {request.rejectionReason}</div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={{color: theme.colors.textColor}}>ยังไม่มีประวัติการขอเติม wallet</div>
          )}
        </section>
      </main>
    </>
  );
};
