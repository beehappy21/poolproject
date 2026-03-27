import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';

import {components} from '../components';
import {URLS} from '../config';
import {theme} from '../constants';
import {hooks} from '../hooks';
import {RootState} from '../store';

type DashboardResponse = {
  wallet?: {
    firmBalance?: string;
  };
};

type WalletTransactionSummary = {
  transactionId: string;
  txType: string;
  amount: string;
  note?: string | null;
  createdAt: string;
  status: string;
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

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('th-TH');
};

const isWithinLastDays = (value?: string | null, days = 5) => {
  if (!value) {
    return false;
  }

  const date = new Date(value).getTime();
  if (Number.isNaN(date)) {
    return false;
  }

  const threshold = Date.now() - (days - 1) * 24 * 60 * 60 * 1000;
  return date >= threshold;
};

export const Firm: React.FC = () => {
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const [loading, setLoading] = useState(true);
  const [firmBalance, setFirmBalance] = useState(0);
  const [transactions, setTransactions] = useState<WalletTransactionSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const loadFirmPage = async () => {
      if (!user?.accessToken) {
        setLoading(false);
        setErrorMessage('ต้องมี session ก่อนจึงจะดูข้อมูล Firm ได้');
        return;
      }

      try {
        const [dashboardResponse, transactionResponse] = await Promise.all([
          axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }),
          axios.get<WalletTransactionSummary[]>(URLS.AUTH_TRANSACTIONS, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
          }),
        ]);

        setFirmBalance(parseDecimal(dashboardResponse.data.wallet?.firmBalance));
        setTransactions(transactionResponse.data || []);
      } catch (error) {
        console.error(error);
        setErrorMessage('ไม่สามารถโหลดข้อมูล Firm ได้ในขณะนี้');
      } finally {
        setLoading(false);
      }
    };

    loadFirmPage();
  }, [user?.accessToken]);

  const recentFirmTransactions = useMemo(() => {
    return transactions.filter(
      transaction =>
        transaction.txType === 'firm_reentry_credit' &&
        isWithinLastDays(transaction.createdAt, 5),
    );
  }, [transactions]);

  return (
    <>
      <components.Header title='Firm' goBack={true} />
      <main style={{padding: '20px 20px 120px', minHeight: 'calc(100vh - 72px)'}}>
        <section
          style={{
            padding: 20,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #0F766E 0%, #0F9B8E 100%)',
            color: '#FFFFFF',
            marginBottom: 18,
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 24,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            Firm Wallet
          </h2>
          <p
            style={{
              margin: 0,
              lineHeight: 1.7,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            สรุปยอด Firm ปัจจุบัน และรายการ Firm ที่ได้รับย้อนหลัง 5 วัน
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
          <p
            style={{
              margin: '0 0 6px',
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            ยอด Firm คงเหลือ
          </p>
          <h3
            style={{
              margin: 0,
              color: theme.colors.mainColor,
              fontSize: 30,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {loading ? 'กำลังโหลด...' : formatAmount(firmBalance)}
          </h3>
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
              margin: '0 0 14px',
              color: theme.colors.mainColor,
              fontSize: 22,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            Firm ย้อนหลัง 5 วัน
          </h3>

          {errorMessage ? (
            <div
              style={{
                marginBottom: 14,
                padding: 14,
                borderRadius: 14,
                color: '#B91C1C',
                backgroundColor: '#FEE2E2',
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          {recentFirmTransactions.length ? (
            <div style={{display: 'grid', gap: 12}}>
              {recentFirmTransactions.map(transaction => (
                <article
                  key={transaction.transactionId}
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
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        color: theme.colors.mainColor,
                        ...theme.fonts.Mulish_700Bold,
                      }}
                    >
                      Firm Credit
                    </div>
                    <div
                      style={{
                        color: '#0F766E',
                        ...theme.fonts.Mulish_700Bold,
                      }}
                    >
                      +{formatAmount(parseDecimal(transaction.amount))}
                    </div>
                  </div>
                  <div style={{color: theme.colors.textColor, lineHeight: 1.7}}>
                    <div>เวลา: {formatDateTime(transaction.createdAt)}</div>
                    <div>สถานะ: {transaction.status}</div>
                    {transaction.note ? <div>หมายเหตุ: {transaction.note}</div> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{color: theme.colors.textColor}}>
              ยังไม่มีรายการ Firm ย้อนหลัง 5 วัน
            </div>
          )}
        </section>
      </main>
    </>
  );
};
