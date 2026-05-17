import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {URLS} from '../config';
import {theme} from '../constants';
import {components} from '../components';
import {hooks} from '../hooks';
import {RootState} from '../store';

const commissionCards = [
  {
    key: 'direct',
    label: 'direct',
    title: 'Direct / โบนัสแนะนำ',
    value: 'รายได้จากผู้แนะนำตรง',
    note: 'ใช้แสดงข้อมูลโบนัสแนะนำจากสมาชิกที่อยู่ใต้สายงานตรง',
  },
  {
    key: 'team',
    label: 'team',
    title: 'Team / โบนัสทีม',
    value: 'รายได้จาก TEAM 2-leg และ 3-leg',
    note: 'ใช้แสดงข้อมูลโบนัสทีมจากยอดที่ระบบ process และจ่ายจริงแล้ว',
  },
  {
    key: 'matching',
    label: 'matching',
    title: 'Matching / โบนัสแมชชิ่ง',
    value: 'รายได้จาก MATCHING L1 และ L2',
    note: 'ใช้แสดงข้อมูล matching bonus ที่อ้างอิงจาก team commission ที่จ่ายจริง',
  },
  {
    key: 'pool',
    label: 'pool',
    title: 'Pool / พูล',
    value: 'รายได้จาก pool bonus',
    note: 'ใช้สำหรับแสดงการแบ่ง pool รายวันหรือรอบที่ระบบอนุมัติแล้ว',
  },
  {
    key: 'cashback',
    label: 'cashback',
    title: 'Cashback / แคชแบ็ก',
    value: 'ซื้อเองแล้วรับคืนตาม PV ที่อนุมัติ',
    note: 'ใช้กับยอด cashback ของสมาชิกจากการซื้อส่วนตัว',
  },
] as const;

type CommissionKey = (typeof commissionCards)[number]['key'];

type CommissionSettingsResponse = {
  appVisibility?: Record<CommissionKey, boolean | undefined>;
};

type WalletSummary = {
  approvedBalance?: string;
  withdrawableBalance?: string;
  shoppingBalance?: string;
  discountBalance?: string;
  firmBalance?: string;
};

type DashboardResponse = {
  wallet?: WalletSummary;
};

type CommissionEntry = {
  commissionId?: string;
  orderId?: string | null;
  sourceUserId?: string;
  beneficiaryUserId?: string | null;
  commissionType?: string;
  levelNo?: number | null;
  amount?: string;
  status?: string;
  companyFallbackReason?: string | null;
  createdAt?: string;
};

type CommissionListResponse = {
  items?: CommissionEntry[];
  total?: number;
  page?: number;
  pageSize?: number;
};

type CommissionResponsePayload = CommissionEntry[] | CommissionListResponse;

type WalletTransactionSummary = {
  transactionId: string;
  txType: string;
  direction?: string;
  balanceBucket?: string;
  refType?: string;
  refId?: string;
  amount: string;
  note?: string | null;
  status: string;
  createdAt: string;
};

type WithdrawRequestSummary = {
  requestId: string;
  amount: string;
  feeAmount?: string;
  netBankAmount: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'exported' | 'paid';
  requestedAt: string;
};

type DirectReferralSummary = {
  memberId: string;
  memberCode: string;
  name: string;
  placementSide?: 'LEFT' | 'MIDDLE' | 'RIGHT' | null;
  childCount: number;
};

type DirectReferralsResponse = {
  directReferrals?: DirectReferralSummary[];
  member?: {
    memberId?: string;
    memberCode?: string;
    name?: string;
  };
};

type DashboardMetrics = {
  cwToday: string;
  cwTotal: string;
  sw: string;
  withdrawPending: string;
  dcw: string;
  firm: string;
};

const defaultMetrics: DashboardMetrics = {
  cwToday: '0.00',
  cwTotal: '0.00',
  sw: '0.00',
  withdrawPending: '0.00',
  dcw: '0.00',
  firm: '0.00',
};

const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const parseDecimal = (value?: string | number | null): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'string') {
    return 0;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDecimal = (value: number): string => {
  return decimalFormatter.format(value);
};

const COMMISSION_TO_SHOPPING_FEE_RATE = 0.05;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('th-TH');
};

const isPostedWithdrawableTransaction = (transaction: WalletTransactionSummary) => {
  return (
    transaction.status?.toLowerCase() === 'posted' &&
    transaction.balanceBucket?.toLowerCase() === 'withdrawable'
  );
};

const formatDateParts = (value?: string | null) => {
  if (!value) {
    return {date: '-', time: '-'};
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {date: '-', time: '-'};
  }

  return {
    date: parsed.toLocaleDateString('th-TH'),
    time: parsed.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
};

const isWithinLastDays = (value?: string | null, days = 5) => {
  if (!value) {
    return false;
  }

  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) {
    return false;
  }

  return parsed >= Date.now() - (days - 1) * 24 * 60 * 60 * 1000;
};

const getCommissionTypeLabel = (value?: string | null) => {
  switch (value?.toLowerCase()) {
    case 'direct':
      return 'Direct';
    case 'team_2leg':
      return 'Team 2-Leg';
    case 'team_3leg':
      return 'Team 3-Leg';
    case 'matching_l1':
      return 'Matching L1';
    case 'matching_l2':
      return 'Matching L2';
    case 'pool':
      return 'Pool';
    case 'cashback':
      return 'Cashback';
    default:
      return 'Commission';
  }
};

const extractCommissionItems = (
  payload?: CommissionResponsePayload,
): CommissionEntry[] => {
  if (!payload) {
    return [];
  }

  return Array.isArray(payload) ? payload : payload.items || [];
};

const extractCommissionTotal = (payload?: CommissionResponsePayload): number => {
  if (!payload) {
    return 0;
  }

  if (Array.isArray(payload)) {
    return payload.length;
  }

  return payload.total ?? payload.items?.length ?? 0;
};

const isNonFallbackCommissionEntry = (entry: CommissionEntry) => {
  return entry.status?.toLowerCase() !== 'fallback';
};

const hasCommissionType = (entry: CommissionEntry, types: string[]) => {
  const normalizedType = entry.commissionType?.toLowerCase();
  return normalizedType ? types.includes(normalizedType) : false;
};

const dashboardTiles = (
  metrics: DashboardMetrics,
) => [
  {
    key: 'cw-today',
    title: 'CW ปัจจุบัน',
    value: metrics.cwToday,
  },
  {
    key: 'cw-total',
    title: 'CW รวม',
    value: metrics.cwTotal,
  },
  {
    key: 'withdraw',
    title: 'ถอน',
    value: metrics.withdrawPending,
  },
  {
    key: 'sw-transfer',
    title: 'โอน SW',
    value: '',
  },
  {
    key: 'dcw',
    title: 'DCW',
    value: metrics.dcw,
  },
  {
    key: 'top-leader',
    title: 'Top leader',
    value: '',
  },
  {
    key: 'firm',
    title: 'Firm',
    value: metrics.firm,
  },
];

export const Commission: React.FC = () => {
  const navigate = useNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<CommissionKey | null>(null);
  const [commissionEntries, setCommissionEntries] = useState<CommissionEntry[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransactionSummary[]>([]);
  const [directReferrals, setDirectReferrals] = useState<DirectReferralSummary[]>([]);
  const [detailPanel, setDetailPanel] = useState<
    'cw-convert' | 'cw-current' | 'cw-total' | 'dcw' | 'top-leader' | null
  >(null);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertMessage, setConvertMessage] = useState('');
  const [convertError, setConvertError] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  const [visibility, setVisibility] = useState<Record<CommissionKey, boolean>>({
    direct: true,
    team: true,
    matching: true,
    pool: true,
    cashback: true,
  });

  const loadCommissionPage = async () => {
    setLoading(true);

    const headers = user?.accessToken
      ? {Authorization: `Bearer ${user.accessToken}`}
      : undefined;
    const authRequestConfig = {
      headers,
      withCredentials: true,
    };

    const fetchAllCommissions = async (): Promise<CommissionEntry[]> => {
      const pageSize = 200;
      const firstResponse = await axios.get<CommissionResponsePayload>(
        `${URLS.AUTH_COMMISSIONS}?page=1&pageSize=${pageSize}`,
        authRequestConfig,
      );

      const firstPayload = firstResponse.data;
      const firstItems = extractCommissionItems(firstPayload);
      const total = extractCommissionTotal(firstPayload);

      if (total <= firstItems.length || total === 0) {
        return firstItems;
      }

      const totalPages = Math.ceil(total / pageSize);
      const remainingResponses = await Promise.all(
        Array.from({length: totalPages - 1}, (_, index) =>
          axios.get<CommissionResponsePayload>(
            `${URLS.AUTH_COMMISSIONS}?page=${index + 2}&pageSize=${pageSize}`,
            authRequestConfig,
          ),
        ),
      );

      return [
        ...firstItems,
        ...remainingResponses.flatMap(response => extractCommissionItems(response.data)),
      ];
    };

    try {
      const [
        commissionSettingsResult,
        dashboardResult,
        commissionsResult,
        transactionsResult,
        withdrawRequestsResult,
      ] = await Promise.allSettled([
        axios.get<CommissionSettingsResponse>(URLS.GET_COMMISSION_SETTINGS),
        axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, authRequestConfig),
        fetchAllCommissions(),
        axios.get<WalletTransactionSummary[]>(URLS.AUTH_TRANSACTIONS, authRequestConfig),
        axios.get<WithdrawRequestSummary[]>(URLS.AUTH_WITHDRAW_REQUESTS, authRequestConfig),
      ]);

      if (commissionSettingsResult.status === 'fulfilled') {
        setVisibility({
          direct: commissionSettingsResult.value.data.appVisibility?.direct !== false,
          team: commissionSettingsResult.value.data.appVisibility?.team !== false,
          matching:
            commissionSettingsResult.value.data.appVisibility?.matching !== false,
          pool: commissionSettingsResult.value.data.appVisibility?.pool !== false,
          cashback:
            commissionSettingsResult.value.data.appVisibility?.cashback !== false,
        });
      }

      const wallet =
        dashboardResult.status === 'fulfilled'
          ? dashboardResult.value.data.wallet
          : undefined;

      const commissions: CommissionEntry[] =
        commissionsResult.status === 'fulfilled' ? commissionsResult.value : [];
      setCommissionEntries(commissions);

      const transactions =
        transactionsResult.status === 'fulfilled' ? transactionsResult.value.data : [];
      setWalletTransactions(transactions);

      const withdrawRequestItems =
        withdrawRequestsResult.status === 'fulfilled'
          ? withdrawRequestsResult.value.data
          : [];

      if (user?.memberCode) {
        try {
          const directReferralsResponse = await axios.get<DirectReferralsResponse>(
            URLS.buildMemberDirectReferralsUrl(user.memberCode),
            {withCredentials: true},
          );
          setDirectReferrals(directReferralsResponse.data.directReferrals || []);
        } catch (directReferralError) {
          console.error(directReferralError);
          setDirectReferrals([]);
        }
      } else {
        setDirectReferrals([]);
      }

      const swBalance = parseDecimal(wallet?.shoppingBalance);
      const pendingWithdrawTotal = withdrawRequestItems.reduce((sum, request) => {
        if (
          request.status === 'pending' ||
          request.status === 'approved' ||
          request.status === 'exported'
        ) {
          return sum + parseDecimal(request.netBankAmount || request.amount);
        }

        return sum;
      }, 0);

      const totalQualifiedCommission = commissions.reduce((sum, entry) => {
        if (
          !isNonFallbackCommissionEntry(entry) ||
          !hasCommissionType(entry, [
            'direct',
            'team_2leg',
            'team_3leg',
            'matching_l1',
            'matching_l2',
            'pool',
          ])
        ) {
          return sum;
        }

        return sum + parseDecimal(entry.amount);
      }, 0);

      const totalConvertedFromCw = transactions.reduce((sum, transaction) => {
        if (!isPostedWithdrawableTransaction(transaction)) {
          return sum;
        }

        const transactionType = transaction.txType?.toLowerCase();
        if (
          transactionType !== 'commission_convert_out' &&
          transactionType !== 'convert_fee_debit'
        ) {
          return sum;
        }

        return sum + parseDecimal(transaction.amount);
      }, 0);

      const totalWithdrawnFromCw = transactions.reduce((sum, transaction) => {
        if (
          !isPostedWithdrawableTransaction(transaction) ||
          transaction.refType?.toLowerCase() !== 'withdraw_request'
        ) {
          return sum;
        }

        const amount = parseDecimal(transaction.amount);
        return transaction.direction?.toLowerCase() === 'credit'
          ? sum - amount
          : sum + amount;
      }, 0);

      const cwCurrent = Math.max(
        totalQualifiedCommission - totalConvertedFromCw - totalWithdrawnFromCw,
        0,
      );

      setMetrics({
        cwToday: formatDecimal(totalQualifiedCommission),
        cwTotal: formatDecimal(cwCurrent),
        sw: formatDecimal(swBalance),
        withdrawPending: formatDecimal(pendingWithdrawTotal),
        dcw: formatDecimal(parseDecimal(wallet?.discountBalance)),
        firm: formatDecimal(parseDecimal(wallet?.firmBalance)),
      });

    } catch (error) {
      console.error(error);
      setMetrics(defaultMetrics);
      setCommissionEntries([]);
      setWalletTransactions([]);
      setDirectReferrals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadCommissionPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken, user?.memberCode, user?.userId]);

  useEffect(() => {
    const handleRefresh = () => {
      if (!document.hidden) {
        loadCommissionPage();
      }
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleRefresh);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.accessToken, user?.memberCode, user?.userId]);

  const visibleButtons = useMemo(() => {
    return commissionCards.filter(card => visibility[card.key]);
  }, [visibility]);

  useEffect(() => {
    if (!visibleButtons.length) {
      setSelectedKey(null);
      return;
    }

    if (selectedKey && !visibleButtons.find(card => card.key === selectedKey)) {
      setSelectedKey(null);
    }
  }, [selectedKey, visibleButtons]);

  const selectedCard = selectedKey
    ? visibleButtons.find(card => card.key === selectedKey)
    : null;
  const isMobileViewport = viewportWidth < 768;
  const cashbackEntries = useMemo(() => {
    return commissionEntries
      .filter(
        entry =>
          isNonFallbackCommissionEntry(entry) &&
          entry.commissionType?.toLowerCase() === 'cashback',
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [commissionEntries]);

  const directEntries = useMemo(() => {
    return commissionEntries
      .filter(
        entry =>
          isNonFallbackCommissionEntry(entry) &&
          entry.commissionType?.toLowerCase() === 'direct',
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [commissionEntries]);

  const teamEntries = useMemo(() => {
    return commissionEntries
      .filter(
        entry =>
          isNonFallbackCommissionEntry(entry) &&
          hasCommissionType(entry, ['team_2leg', 'team_3leg']),
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [commissionEntries]);

  const matchingEntries = useMemo(() => {
    return commissionEntries
      .filter(
        entry =>
          isNonFallbackCommissionEntry(entry) &&
          hasCommissionType(entry, ['matching_l1', 'matching_l2']),
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [commissionEntries]);

  const poolEntries = useMemo(() => {
    return commissionEntries
      .filter(
        entry =>
          isNonFallbackCommissionEntry(entry) &&
          entry.commissionType?.toLowerCase() === 'pool',
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [commissionEntries]);

  const cashbackTotal = useMemo(() => {
    return cashbackEntries.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
  }, [cashbackEntries]);

  const directTotal = useMemo(() => {
    return directEntries.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
  }, [directEntries]);

  const teamTotal = useMemo(() => {
    return teamEntries.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
  }, [teamEntries]);

  const matchingTotal = useMemo(() => {
    return matchingEntries.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
  }, [matchingEntries]);

  const poolTotal = useMemo(() => {
    return poolEntries.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
  }, [poolEntries]);

  const recentDcwTransactions = useMemo(() => {
    return walletTransactions
      .filter(
        transaction =>
          transaction.txType === 'dcw_credit' &&
          isWithinLastDays(transaction.createdAt, 5),
      )
      .sort((left, right) => {
        return (
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime()
        );
      });
  }, [walletTransactions]);

  const memberDirectory = useMemo(() => {
    const directory = new Map<string, {memberCode?: string; name?: string}>();

    directReferrals.forEach(referral => {
      directory.set(referral.memberId, {
        memberCode: referral.memberCode,
        name: referral.name,
      });
    });

    return directory;
  }, [directReferrals]);

  const topLeaderRows = useMemo(() => {
    const totals = new Map<string, number>();

    commissionEntries.forEach(entry => {
      if (!entry.sourceUserId || entry.status?.toLowerCase() === 'fallback') {
        return;
      }

      totals.set(
        entry.sourceUserId,
        (totals.get(entry.sourceUserId) || 0) + parseDecimal(entry.amount),
      );
    });

    return Array.from(totals.entries())
      .map(([sourceUserId, amount]) => {
        const member = memberDirectory.get(sourceUserId);
        return {
          sourceUserId,
          memberCode: member?.memberCode || `U${sourceUserId}`,
          name: member?.name || 'สมาชิกใต้สายงาน',
          amount,
        };
      })
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10);
  }, [commissionEntries, memberDirectory]);

  const tiles = dashboardTiles(metrics);

  const cwQualifiedEntries = useMemo(() => {
    return commissionEntries.filter(
      entry =>
        isNonFallbackCommissionEntry(entry) &&
        hasCommissionType(entry, [
          'direct',
          'team_2leg',
          'team_3leg',
          'matching_l1',
          'matching_l2',
          'pool',
        ]),
    );
  }, [commissionEntries]);

  const cwReceivedTotal = useMemo(() => {
    return cwQualifiedEntries.reduce((sum, entry) => sum + parseDecimal(entry.amount), 0);
  }, [cwQualifiedEntries]);

  const cwConvertedTransactions = useMemo(() => {
    return walletTransactions
      .filter(transaction => {
        if (!isPostedWithdrawableTransaction(transaction)) {
          return false;
        }

        const transactionType = transaction.txType?.toLowerCase();
        return (
          transactionType === 'commission_convert_out' ||
          transactionType === 'convert_fee_debit'
        );
      })
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [walletTransactions]);

  const cwConvertedTotal = useMemo(() => {
    return cwConvertedTransactions.reduce(
      (sum, transaction) => sum + parseDecimal(transaction.amount),
      0,
    );
  }, [cwConvertedTransactions]);

  const cwWithdrawTransactions = useMemo(() => {
    return walletTransactions
      .filter(
        transaction =>
          isPostedWithdrawableTransaction(transaction) &&
          transaction.refType?.toLowerCase() === 'withdraw_request',
      )
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [walletTransactions]);

  const cwWithdrawnTotal = useMemo(() => {
    return cwWithdrawTransactions.reduce((sum, transaction) => {
      const amount = parseDecimal(transaction.amount);
      return transaction.direction?.toLowerCase() === 'credit'
        ? sum - amount
        : sum + amount;
    }, 0);
  }, [cwWithdrawTransactions]);

  const cwCurrentBalance = useMemo(() => {
    return Math.max(cwReceivedTotal - cwConvertedTotal - cwWithdrawnTotal, 0);
  }, [cwConvertedTotal, cwReceivedTotal, cwWithdrawnTotal]);

  const cwAvailableForDisplay = useMemo(() => {
    return Math.max(cwCurrentBalance, 0);
  }, [cwCurrentBalance]);

  const commissionOverviewCards = useMemo(() => {
    const cardMap: Record<
      CommissionKey,
      {title: string; amount: number; count: number; accent: string}
    > = {
      direct: {
        title: 'Direct',
        amount: directTotal,
        count: directEntries.length,
        accent: '#1D4ED8',
      },
      team: {
        title: 'Team',
        amount: teamTotal,
        count: teamEntries.length,
        accent: '#EA580C',
      },
      matching: {
        title: 'Matching',
        amount: matchingTotal,
        count: matchingEntries.length,
        accent: '#7C3AED',
      },
      pool: {
        title: 'Pool',
        amount: poolTotal,
        count: poolEntries.length,
        accent: '#0284C7',
      },
      cashback: {
        title: 'Cashback',
        amount: cashbackTotal,
        count: cashbackEntries.length,
        accent: '#0F766E',
      },
    };

    return visibleButtons.map(card => ({
      key: card.key,
      title: cardMap[card.key].title,
      amount: cardMap[card.key].amount,
      count: cardMap[card.key].count,
      accent: cardMap[card.key].accent,
    }));
  }, [
    cashbackEntries.length,
    cashbackTotal,
    directEntries.length,
    directTotal,
    matchingEntries.length,
    matchingTotal,
    poolEntries.length,
    poolTotal,
    teamEntries.length,
    teamTotal,
    visibleButtons,
  ]);


  const renderCommissionSummaryCard = () => {
    if (!selectedCard) {
      return null;
    }

    const selectedEntriesMap: Record<CommissionKey, CommissionEntry[]> = {
      direct: directEntries,
      team: teamEntries,
      matching: matchingEntries,
      pool: poolEntries,
      cashback: cashbackEntries,
    };

    const selectedTotalMap: Record<CommissionKey, number> = {
      direct: directTotal,
      team: teamTotal,
      matching: matchingTotal,
      pool: poolTotal,
      cashback: cashbackTotal,
    };

    const selectedEntries = selectedEntriesMap[selectedCard.key];
    const selectedTotal = selectedTotalMap[selectedCard.key];

    return (
      <section style={{display: 'grid', gap: 12}}>
        <div
          key={selectedCard.title}
          style={{
            padding: 18,
            borderRadius: 16,
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.aliceBlue2}`,
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              color: theme.colors.textColor,
              fontSize: 14,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {selectedCard.title}
          </p>
          <h3
            style={{
              margin: '0 0 8px',
              color: theme.colors.mainColor,
              fontSize: 22,
              ...theme.fonts.Mulish_700Bold,
            }}
            >
            รวม {formatDecimal(selectedTotal)}
          </h3>
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              lineHeight: 1.6,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {selectedCard.key === 'direct'
              ? `สมาชิกสายตรง ${directReferrals.length} คน · รายการ direct ${directEntries.length} รายการ`
              : `${selectedCard.note} · พบ ${selectedEntries.length} รายการ`}
          </p>
        </div>

        {selectedCard.key === 'direct' && directReferrals.length ? (
          <section
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: '#F8FAFC',
              border: `1px solid ${theme.colors.aliceBlue2}`,
            }}
          >
            <div
              style={{
                marginBottom: 10,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              สมาชิกสายตรง
            </div>
            <div style={{display: 'grid', gap: 10}}>
              {directReferrals.slice(0, 5).map(referral => (
                <div
                  key={referral.memberId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                      {referral.memberCode}
                    </div>
                    <div style={{color: theme.colors.textColor}}>{referral.name}</div>
                  </div>
                  <div style={{color: theme.colors.textColor}}>
                    ทีมย่อย {referral.childCount}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {selectedEntries.slice(0, 5).map(entry => {
          const member = entry.sourceUserId
            ? memberDirectory.get(entry.sourceUserId)
            : undefined;

          return (
            <article
              key={entry.commissionId || `${entry.createdAt}-${entry.amount}`}
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
                <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                  {getCommissionTypeLabel(entry.commissionType)}
                </div>
                <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                  {formatDecimal(parseDecimal(entry.amount))}
                </div>
              </div>
              <div style={{color: theme.colors.textColor, lineHeight: 1.6}}>
                {member?.memberCode || member?.name ? (
                  <div>
                    จาก: {member?.memberCode || '-'}
                    {member?.name ? ` · ${member.name}` : ''}
                  </div>
                ) : null}
                <div>เวลา: {formatDateTime(entry.createdAt)}</div>
                <div>สถานะ: {entry.status || '-'}</div>
              </div>
            </article>
          );
        })}

        {!selectedEntries.length && !(selectedCard.key === 'direct' && directReferrals.length) ? (
          <div style={{color: theme.colors.textColor}}>
            ยังไม่มีข้อมูล {selectedCard.label}
          </div>
        ) : null}
      </section>
    );
  };

  const handleTileClick = (tileKey: string) => {
    if (tileKey === 'sw-transfer') {
      navigate('/TransferSW');
      return;
    }

    if (tileKey === 'withdraw') {
      navigate('/WithdrawSW');
      return;
    }

    if (tileKey === 'cw-today') {
      setDetailPanel('cw-current');
      return;
    }

    if (tileKey === 'dcw') {
      setDetailPanel('dcw');
      return;
    }

    if (tileKey === 'top-leader') {
      setDetailPanel('top-leader');
      return;
    }

    if (tileKey === 'firm') {
      navigate('/Firm');
      return;
    }

    if (tileKey === 'cw-total') {
      setDetailPanel('cw-total');
      return;
    }

  };

  const handleConvertCwToSw = async () => {
    if (!user?.accessToken) {
      setConvertError('ต้องมี session ก่อนจึงจะเปลี่ยน CW เป็น SW');
      return;
    }

    const amount = parseDecimal(convertAmount);
    if (amount <= 0) {
      setConvertError('กรุณาระบุจำนวน CW ที่ต้องการเปลี่ยน');
      return;
    }

    if (amount > cwAvailableForDisplay) {
      setConvertError('จำนวนที่เปลี่ยนต้องไม่เกิน CW ปัจจุบัน');
      return;
    }

    setConvertSubmitting(true);
    setConvertError('');
    setConvertMessage('');

    try {
      const response = await axios.post(
        URLS.AUTH_WALLETS_CONVERT,
        {amount: amount.toFixed(2)},
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );

      setConvertAmount('');
      const feeAmount = parseDecimal(response.data?.feeAmount);
      const netShoppingAmount = parseDecimal(response.data?.netShoppingAmount);
      setConvertMessage(
        `เปลี่ยน CW เป็น SW สำเร็จ หักค่าบริการ ${formatDecimal(
          feeAmount,
        )} ได้รับ SW ${formatDecimal(netShoppingAmount)}`,
      );
      await loadCommissionPage();
    } catch (error: any) {
      setConvertError(
        error?.response?.data?.message || 'ไม่สามารถเปลี่ยน CW เป็น SW ได้ในขณะนี้',
      );
    } finally {
      setConvertSubmitting(false);
    }
  };

  const renderDetailPanel = (): JSX.Element | null => {
    if (!detailPanel) {
      return null;
    }

    let title = '';
    let content: JSX.Element | null = null;
    const requestedAmount = parseDecimal(convertAmount);
    const convertFeePreview = requestedAmount * COMMISSION_TO_SHOPPING_FEE_RATE;
    const netSwPreview = Math.max(requestedAmount - convertFeePreview, 0);

    const renderConvertSection = () => (
      <div style={{display: 'grid', gap: 14}}>
        <div
          style={{
            padding: 16,
            borderRadius: 14,
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
          }}
        >
          <div style={{marginBottom: 6, color: theme.colors.textColor}}>CW ปัจจุบัน</div>
          <div
            style={{
              color: theme.colors.mainColor,
              fontSize: 24,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {formatDecimal(cwAvailableForDisplay)}
          </div>
          <div
            style={{
              marginTop: 8,
              color: theme.colors.textColor,
              opacity: 0.76,
              lineHeight: 1.5,
            }}
          >
            CW ปัจจุบันคือยอดที่ใช้เปลี่ยนเป็น SW ได้ตามเงื่อนไขของระบบในเวอร์ชันนี้
          </div>
        </div>

        <input
          value={convertAmount}
          onChange={event => setConvertAmount(event.target.value)}
          placeholder='จำนวน CW ที่ต้องการเปลี่ยน'
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
            backgroundColor: '#F8FAFC',
            border: `1px solid ${theme.colors.aliceBlue2}`,
            color: theme.colors.textColor,
            lineHeight: 1.7,
          }}
        >
          <div>ยอด CW ที่ต้องการเปลี่ยน: {formatDecimal(requestedAmount)}</div>
          <div>ค่าบริการ 5%: {formatDecimal(convertFeePreview)}</div>
          <div>ยอด SW สุทธิที่จะได้รับ: {formatDecimal(netSwPreview)}</div>
        </div>

        {convertMessage ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: '#DCFCE7',
              color: '#166534',
            }}
          >
            {convertMessage}
          </div>
        ) : null}

        {convertError ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
            }}
          >
            {convertError}
          </div>
        ) : null}

        <button
          type='button'
          disabled={convertSubmitting || loading}
          onClick={handleConvertCwToSw}
          style={{
            height: 50,
            border: 'none',
            borderRadius: 14,
            cursor: convertSubmitting ? 'not-allowed' : 'pointer',
            backgroundColor: theme.colors.mainColor,
            color: theme.colors.mainYellow,
            ...theme.fonts.Mulish_700Bold,
          }}
        >
          {convertSubmitting ? 'กำลังเปลี่ยน...' : 'ยืนยันเปลี่ยน CW เป็น SW'}
        </button>
      </div>
    );

    if (detailPanel === 'cw-convert') {
      title = 'เปลี่ยน CW เป็น SW';
      content = renderConvertSection();
    }

    if (detailPanel === 'cw-current' || detailPanel === 'cw-total') {
      const isCurrentPanel = detailPanel === 'cw-current';
      title = isCurrentPanel ? 'CW ปัจจุบัน' : 'CW รวม';
      const recentCwActivity = [
        ...cwConvertedTransactions.map(transaction => ({
          key: `convert-${transaction.transactionId}`,
          label:
            transaction.txType?.toLowerCase() === 'convert_fee_debit'
              ? 'หักค่าบริการแปลง CW > SW'
              : 'แปลง CW > SW',
          amount:
            (transaction.direction?.toLowerCase() === 'credit' ? 1 : -1) *
            parseDecimal(transaction.amount),
          createdAt: transaction.createdAt,
        })),
        ...cwWithdrawTransactions.map(transaction => ({
          key: `withdraw-${transaction.transactionId}`,
          label:
            transaction.direction?.toLowerCase() === 'credit'
              ? 'คืน CW จากยกเลิกคำขอถอน'
              : 'หัก CW สำหรับคำขอถอน',
          amount:
            (transaction.direction?.toLowerCase() === 'credit' ? 1 : -1) *
            parseDecimal(transaction.amount),
          createdAt: transaction.createdAt,
        })),
      ]
        .sort(
          (left, right) =>
            new Date(right.createdAt || 0).getTime() -
            new Date(left.createdAt || 0).getTime(),
        )
        .slice(0, 8);

      content = (
        <div style={{display: 'grid', gap: 12}}>
          <article
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: '#F8FAFC',
              border: `1px solid ${theme.colors.aliceBlue2}`,
              color: theme.colors.textColor,
              lineHeight: 1.8,
            }}
          >
            <div>คอมสะสมจาก Direct + Team + Matching + Pool: {formatDecimal(cwReceivedTotal)}</div>
            <div>แปลง CW เป็น SW แล้ว: {formatDecimal(cwConvertedTotal)}</div>
            <div>ถอนจาก CW แล้ว: {formatDecimal(cwWithdrawnTotal)}</div>
            <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
              {isCurrentPanel
                ? `CW ปัจจุบัน: ${formatDecimal(cwCurrentBalance)}`
                : `CW รวม: ${formatDecimal(cwReceivedTotal)}`}
            </div>
          </article>

          {isCurrentPanel ? renderConvertSection() : null}

          {recentCwActivity.length ? (
            <div
              style={{
                display: 'grid',
                gap: 12,
                maxHeight: '58vh',
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {recentCwActivity.map(activity => {
                const {date, time} = formatDateParts(activity.createdAt);
                const isCredit = activity.amount >= 0;

                return (
                  <article
                    key={activity.key}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: '#F8FAFC',
                      border: `1px solid ${theme.colors.aliceBlue2}`,
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: theme.colors.mainColor,
                          fontSize: 16,
                          lineHeight: 1.2,
                          ...theme.fonts.Mulish_700Bold,
                        }}
                      >
                        {date}
                      </div>
                      <div
                        style={{
                          marginTop: 2,
                          color: '#64748B',
                          fontSize: 8,
                          lineHeight: 1.2,
                          ...theme.fonts.Mulish_600SemiBold,
                        }}
                      >
                        {time}
                      </div>
                    </div>

                    <div style={{color: theme.colors.textColor}}>
                      รายการ: <strong style={{color: theme.colors.mainColor}}>{activity.label}</strong>
                    </div>

                    <div
                      style={{
                        color: theme.colors.textColor,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <span>ยอดเงิน</span>
                      <strong
                        style={{
                          color: isCredit ? '#166534' : '#B91C1C',
                          maxWidth: '55%',
                          overflowX: 'auto',
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                        }}
                      >
                        {isCredit ? '+' : '-'}
                        {formatDecimal(Math.abs(activity.amount))}
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={{color: theme.colors.textColor}}>
              ยังไม่พบรายการแปลง CW หรือถอนจาก CW
            </div>
          )}
        </div>
      );
    }

    if (detailPanel === 'dcw') {
      title = 'DCW ย้อนหลัง 5 วัน';
      content = recentDcwTransactions.length ? (
        <div style={{display: 'grid', gap: 12}}>
          {recentDcwTransactions.map(transaction => (
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
                  marginBottom: 8,
                }}
              >
                <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                  DCW Credit
                </div>
                <div style={{color: '#166534', ...theme.fonts.Mulish_700Bold}}>
                  +{formatDecimal(parseDecimal(transaction.amount))}
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
        <div style={{color: theme.colors.textColor}}>ยังไม่มีรายการ DCW ย้อนหลัง 5 วัน</div>
      );
    }

    if (detailPanel === 'top-leader') {
      title = '10 คนใต้สายงานที่มียอดคอมมิชชั่นสูงสุด';
      content = topLeaderRows.length ? (
        <div style={{display: 'grid', gap: 12}}>
          {topLeaderRows.map((row, index) => (
            <article
              key={row.sourceUserId}
              style={{
                padding: 14,
                borderRadius: 14,
                backgroundColor: '#F8FAFC',
                border: `1px solid ${theme.colors.aliceBlue2}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div>
                <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                  {index + 1}. {row.memberCode}
                </div>
                <div style={{color: theme.colors.textColor}}>{row.name}</div>
              </div>
              <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                {formatDecimal(row.amount)}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{color: theme.colors.textColor}}>
          ยังไม่มีข้อมูลเพียงพอสำหรับจัดอันดับ top leader
        </div>
      );
    }

    if (!content) {
      return null;
    }

    return (
      <div
        onClick={() => setDetailPanel(null)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1001,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          onClick={event => event.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 760,
            maxHeight: '80vh',
            overflowY: 'auto',
            borderRadius: 24,
            backgroundColor: theme.colors.white,
            padding: 24,
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.24)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <h3
              style={{
                margin: 0,
                color: theme.colors.mainColor,
                fontSize: 24,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {title}
            </h3>
            <button
              onClick={() => setDetailPanel(null)}
              style={{
                border: 'none',
                backgroundColor: '#EEF4FB',
                color: theme.colors.mainColor,
                borderRadius: 999,
                padding: '10px 14px',
                cursor: 'pointer',
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              ปิด
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  };

  return (
    <>
      <components.Header title='คอมมิชชั่น / Commission' goBack={true} />
      <main style={{padding: '20px 20px 120px'}}>
        <section
          style={{
            padding: 20,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #1E3A8A 0%, #274690 100%)',
            color: '#FFFFFF',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 24,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            Commission Dashboard
          </h2>
        </section>

        <section style={{marginBottom: 18}}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {loading ? (
              <div
                style={{
                  color: theme.colors.textColor,
                  ...theme.fonts.Mulish_400Regular,
                }}
              >
                กำลังโหลดเมนู...
              </div>
            ) : visibleButtons.length === 0 ? (
              <div
                style={{
                  color: theme.colors.textColor,
                  ...theme.fonts.Mulish_400Regular,
                }}
              >
                BAO ปิดการแสดงผลเมนูคอมมิชชั่นทั้งหมดไว้
              </div>
            ) : (
              visibleButtons.map(card => {
                const isActive = selectedCard?.key === card.key;

                return (
                  <button
                    key={card.key}
                    onClick={() =>
                      setSelectedKey(current => (current === card.key ? null : card.key))
                    }
                    style={{
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      backgroundColor: isActive
                        ? theme.colors.mainColor
                        : '#EAF1F8',
                      color: isActive
                        ? theme.colors.mainYellow
                        : theme.colors.mainColor,
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    {card.label}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {!selectedCard ? (
          <>
            <section
              style={{
                marginBottom: 16,
                padding: '16px 18px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '1px solid #BFDBFE',
                boxShadow: '0 16px 32px rgba(59, 130, 246, 0.10)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <button
                  type='button'
                  onClick={() => {
                    setConvertMessage('');
                    setConvertError('');
                    setDetailPanel('cw-convert');
                  }}
                  style={{
                    minWidth: 44,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(37, 99, 235, 0.14)',
                    color: '#1D4ED8',
                    fontSize: 18,
                    border: 'none',
                    cursor: 'pointer',
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  SW
                </button>
                <div
                  style={{
                    flex: 1,
                    color: theme.colors.mainColor,
                    fontSize: isMobileViewport ? 24 : 28,
                    lineHeight: 1,
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  SW {metrics.sw}
                </div>
              </div>
            </section>

            <section
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 14,
                marginBottom: 20,
              }}
            >
              {tiles.map(tile => (
                <article
                  key={tile.key}
                  onClick={() => handleTileClick(tile.key)}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 18,
                    backgroundColor: theme.colors.white,
                    border: `1px solid ${theme.colors.aliceBlue2}`,
                    boxShadow: '0 16px 32px rgba(31, 41, 55, 0.06)',
                    minHeight: 84,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor:
                      tile.key === 'cw-today' ||
                      tile.key === 'cw-total' ||
                      tile.key === 'withdraw' ||
                      tile.key === 'sw-transfer' ||
                      tile.key === 'dcw' ||
                      tile.key === 'top-leader' ||
                      tile.key === 'firm'
                        ? 'pointer'
                        : 'default',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      width: '100%',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        color: theme.colors.mainColor,
                        fontSize: 18,
                        lineHeight: 1.3,
                        ...theme.fonts.Mulish_700Bold,
                      }}
                    >
                      {tile.title}
                    </p>
                    {tile.value ? (
                      <p
                        style={{
                          margin: 0,
                          color: theme.colors.mainColor,
                          fontSize: 20,
                          lineHeight: 1,
                          whiteSpace: 'nowrap',
                          ...theme.fonts.Mulish_700Bold,
                        }}
                      >
                        {tile.value}
                      </p>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          color: '#94A3B8',
                          fontSize: 24,
                          lineHeight: 1,
                          ...theme.fonts.Mulish_700Bold,
                        }}
                      >
                        &rsaquo;
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : null}

        {!selectedCard ? (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 14,
              marginBottom: 20,
            }}
          >
            {commissionOverviewCards.map(card => (
              <button
                key={card.key}
                type='button'
                onClick={() => setSelectedKey(card.key)}
                style={{
                  border: `1px solid ${theme.colors.aliceBlue2}`,
                  borderRadius: 18,
                  backgroundColor: theme.colors.white,
                  padding: '16px 18px',
                  textAlign: 'left',
                  display: 'grid',
                  gap: 6,
                  boxShadow: '0 16px 32px rgba(31, 41, 55, 0.06)',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    color: card.accent,
                    fontSize: 12,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    color: theme.colors.mainColor,
                    fontSize: 24,
                    lineHeight: 1,
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  {formatDecimal(card.amount)}
                </div>
                <div
                  style={{
                    color: theme.colors.textColor,
                    fontSize: 12,
                    lineHeight: 1.5,
                    ...theme.fonts.Mulish_400Regular,
                  }}
                >
                  {card.count} รายการ
                </div>
              </button>
            ))}
          </section>
        ) : null}

        {selectedKey ? renderCommissionSummaryCard() : null}
        {renderDetailPanel()}
      </main>
    </>
  );
};
