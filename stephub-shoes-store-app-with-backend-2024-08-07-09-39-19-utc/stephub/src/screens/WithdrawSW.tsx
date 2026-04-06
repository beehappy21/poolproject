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

type WithdrawRequestSummary = {
  requestId: string;
  amount: string;
  netBankAmount: string;
  bankName: string;
  accountName: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'exported' | 'paid';
  requestedAt: string;
};

type KycRequestSummary = {
  requestId: string;
  nationalId: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  bankAccountType: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt: string | null;
  submittedAt: string;
};

const parseDecimal = (value?: string | null) => {
  const parsed = Number.parseFloat(value || '0');
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const WithdrawSW: React.FC = () => {
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [maxWithdraw, setMaxWithdraw] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<WithdrawRequestSummary[]>([]);
  const [kycRequests, setKycRequests] = useState<KycRequestSummary[]>([]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const latestApprovedKyc = useMemo(
    () => kycRequests.find(request => request.status === 'approved') || null,
    [kycRequests],
  );
  const canWithdraw =
    !!latestApprovedKyc?.nationalId?.trim() &&
    !!latestApprovedKyc?.bankName?.trim() &&
    !!latestApprovedKyc?.bankAccountName?.trim() &&
    !!latestApprovedKyc?.bankAccountNumber?.trim();

  useEffect(() => {
    const loadWallet = async () => {
      if (!user?.accessToken) {
        setLoading(false);
        setErrorMessage('ต้องมี session ก่อนจึงจะส่งคำขอถอน SW ได้');
        return;
      }

      try {
        const [dashboardResponse, requestsResponse, kycRequestsResponse] = await Promise.all([
          axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }),
          axios.get<WithdrawRequestSummary[]>(URLS.AUTH_WITHDRAW_REQUESTS, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }),
          axios.get<KycRequestSummary[]>(URLS.AUTH_KYC_REQUESTS, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }),
        ]);
        setMaxWithdraw(parseDecimal(dashboardResponse.data.wallet?.shoppingBalance));
        setPendingRequests(
          (requestsResponse.data || []).filter(
            request =>
              request.status === 'pending' ||
              request.status === 'approved' ||
              request.status === 'exported',
          ),
        );
        setKycRequests(Array.isArray(kycRequestsResponse.data) ? kycRequestsResponse.data : []);
      } catch (error) {
        console.error(error);
        setErrorMessage('ไม่สามารถโหลดข้อมูลยอด SW ปัจจุบันได้');
      } finally {
        setLoading(false);
      }
    };

    loadWallet();
  }, [user?.accessToken]);

  const amountNumber = useMemo(() => parseDecimal(amount), [amount]);
  const pendingTotal = useMemo(() => {
    return pendingRequests.reduce(
      (sum, request) => sum + parseDecimal(request.netBankAmount || request.amount),
      0,
    );
  }, [pendingRequests]);

  const handleSubmit = async () => {
    if (!user?.accessToken) {
      setErrorMessage('ต้องมี session ก่อนจึงจะส่งคำขอถอน SW ได้');
      return;
    }

    if (amountNumber <= 0) {
      setErrorMessage('กรุณาระบุจำนวนที่ต้องการถอน');
      return;
    }

    if (amountNumber > maxWithdraw) {
      setErrorMessage('จำนวนถอนต้องไม่เกินยอด SW ที่มี');
      return;
    }

    if (!canWithdraw) {
      setErrorMessage('ต้องทำ KYC บัตรประชาชนและบัญชีธนาคารให้อนุมัติก่อนจึงจะถอน SW ได้');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setMessage('');

    try {
      const response = await axios.post<WithdrawRequestSummary>(
        URLS.AUTH_WITHDRAW_REQUESTS,
        {
          amount: amountNumber.toFixed(2),
          note: note.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      setAmount('');
      setNote('');
      setPendingRequests(current => [
        response.data,
        ...current,
      ]);
      setMessage(
        'ส่งคำขอถอน SW ให้ admin แล้ว ระบบจะนำรายการนี้ไปทำรายงานเพื่อโอนเงินต่อไป',
      );
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'ไม่สามารถส่งคำขอถอน SW ได้ในขณะนี้',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <components.Header title='ถอน SW' goBack={true} />
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
            ขอถอน SW
          </h2>
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              lineHeight: 1.7,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            หน้านี้ใช้ส่งเรื่องให้ admin จัดทำรายงานและดำเนินการโอนเงินในขั้นตอนถัดไป
          </p>
        </section>

        <section
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: 18,
            border: `1px solid ${theme.colors.aliceBlue2}`,
            padding: 20,
          }}
        >
          <div style={{marginBottom: 18}}>
            <p
              style={{
                margin: '0 0 6px',
                color: theme.colors.textColor,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              ยอด SW ที่ถอนออกได้
            </p>
            <h3
              style={{
                margin: 0,
                color: theme.colors.mainColor,
                fontSize: 28,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {loading ? 'กำลังโหลด...' : formatAmount(maxWithdraw)}
            </h3>
          </div>

          <div
            style={{
              marginBottom: 18,
              padding: 16,
              borderRadius: 14,
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
            }}
          >
            <div
              style={{
                marginBottom: 6,
                color: theme.colors.textColor,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              ยอดคำขอถอนที่ยังไม่โอน
            </div>
            <div
              style={{
                color: theme.colors.mainColor,
                fontSize: 24,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {formatAmount(pendingTotal)}
            </div>
          </div>

          <div style={{display: 'grid', gap: 14}}>
            <input
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder='จำนวนที่ต้องการถอน'
              inputMode='decimal'
              style={{
                height: 48,
                borderRadius: 12,
                border: `1px solid ${theme.colors.aliceBlue2}`,
                padding: '0 14px',
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_400Regular,
              }}
            />
            <div
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: canWithdraw ? '#F8FAFC' : '#FEF2F2',
                border: `1px solid ${canWithdraw ? '#CBD5E1' : '#FECACA'}`,
              }}
            >
              <div
                style={{
                  marginBottom: 10,
                  color: theme.colors.mainColor,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                บัญชีรับโอนจาก KYC
              </div>
              <div style={{display: 'grid', gap: 6, color: theme.colors.textColor}}>
                <div>เลขบัตรประชาชน: {latestApprovedKyc?.nationalId || '-'}</div>
                <div>ธนาคาร: {latestApprovedKyc?.bankName || '-'}</div>
                <div>สาขา: {latestApprovedKyc?.bankBranch || '-'}</div>
                <div>ชื่อบัญชี: {latestApprovedKyc?.bankAccountName || '-'}</div>
                <div>ประเภทบัญชี: {latestApprovedKyc?.bankAccountType || '-'}</div>
                <div>เลขบัญชี: {latestApprovedKyc?.bankAccountNumber || '-'}</div>
              </div>
              {!canWithdraw ? (
                <div
                  style={{
                    marginTop: 10,
                    color: theme.colors.coralRed,
                    ...theme.fonts.Mulish_400Regular,
                  }}
                >
                  ต้องทำ KYC บัตรประชาชนและบัญชีธนาคารให้อนุมัติก่อน จึงจะกดถอน SW ได้
                </div>
              ) : null}
            </div>
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              placeholder='หมายเหตุเพิ่มเติม'
              rows={4}
              style={{
                borderRadius: 12,
                border: `1px solid ${theme.colors.aliceBlue2}`,
                padding: 14,
                color: theme.colors.mainColor,
                resize: 'vertical',
                ...theme.fonts.Mulish_400Regular,
              }}
            />
          </div>

          {errorMessage ? (
            <p
              style={{
                margin: '14px 0 0',
                color: theme.colors.coralRed,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          {message ? (
            <p
              style={{
                margin: '14px 0 0',
                color: '#15803D',
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {message}
            </p>
          ) : null}

          <button
            onClick={handleSubmit}
            disabled={loading || submitting || !canWithdraw}
            style={{
              marginTop: 18,
              width: '100%',
              height: 50,
              border: 'none',
              borderRadius: 14,
              cursor: loading || submitting || !canWithdraw ? 'not-allowed' : 'pointer',
              backgroundColor:
                loading || submitting || !canWithdraw ? '#94A3B8' : theme.colors.mainColor,
              color: theme.colors.mainYellow,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {submitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอถอน SW'}
          </button>
        </section>

        <section
          style={{
            marginTop: 18,
            backgroundColor: theme.colors.white,
            borderRadius: 18,
            border: `1px solid ${theme.colors.aliceBlue2}`,
            padding: 20,
          }}
        >
          <h3
            style={{
              margin: '0 0 14px',
              color: theme.colors.mainColor,
              fontSize: 22,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            รายการถอนที่ยังไม่โอน
          </h3>

          {pendingRequests.length ? (
            <div style={{display: 'grid', gap: 12}}>
              {pendingRequests.map(request => (
                <article
                  key={request.requestId}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: '#F8FAFC',
                    border: `1px solid ${theme.colors.aliceBlue2}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        color: theme.colors.mainColor,
                        ...theme.fonts.Mulish_700Bold,
                      }}
                    >
                      #{request.requestId}
                    </div>
                    <div
                      style={{
                        color:
                          request.status === 'exported'
                            ? '#1D4ED8'
                            : request.status === 'approved'
                              ? '#166534'
                              : '#B45309',
                        ...theme.fonts.Mulish_700Bold,
                      }}
                    >
                      {request.status}
                    </div>
                  </div>
                  <div style={{color: theme.colors.textColor, lineHeight: 1.7}}>
                    <div>ยอดแจ้งถอน: {formatAmount(parseDecimal(request.amount))}</div>
                    <div>ยอดสุทธิ: {formatAmount(parseDecimal(request.netBankAmount))}</div>
                    <div>ธนาคาร: {request.bankName}</div>
                    <div>ชื่อบัญชี: {request.accountName}</div>
                    <div>เวลาแจ้ง: {new Date(request.requestedAt).toLocaleString('th-TH')}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{color: theme.colors.textColor}}>ยังไม่มีรายการถอนที่รอโอน</div>
          )}
        </section>
      </main>
    </>
  );
};
