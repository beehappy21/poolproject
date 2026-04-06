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
    key: 'cashback',
    label: 'cashback',
    title: 'Cashback / แคชแบ็ก',
    value: 'ซื้อเองแล้วรับคืนตาม PV ที่อนุมัติ',
    note: 'ใช้กับยอด cashback ของสมาชิกจากการซื้อส่วนตัว',
  },
  {
    key: 'direct',
    label: 'direct',
    title: 'Direct / โบนัสแนะนำ',
    value: 'รายได้จากผู้แนะนำตรง',
    note: 'ใช้แสดงข้อมูลโบนัสแนะนำจากสมาชิกที่อยู่ใต้สายงานตรง',
  },
  {
    key: 'unilevel',
    label: 'unilevel',
    title: 'Unilevel / ยูนิลีเวล',
    value: 'รายได้ตามลำดับชั้นทีมงาน',
    note: 'ใช้สำหรับสรุปคอมมิชชั่นระดับทีมหลายชั้น',
  },
  {
    key: 'matrix',
    label: 'matrix',
    title: 'Matrix / เมทริกซ์',
    value: 'รายได้จาก matrix board',
    note: 'ใช้แสดงผล payout ของ matrix ตาม board ที่สมาชิกมีสิทธิ์',
  },
  {
    key: 'pool',
    label: 'pool',
    title: 'Pool / พูล',
    value: 'รายได้จาก pool bonus',
    note: 'ใช้สำหรับแสดงการแบ่ง pool รายวันหรือรอบที่ระบบอนุมัติแล้ว',
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
  amount: string;
  note?: string | null;
  status: string;
  createdAt: string;
};

type WithdrawRequestSummary = {
  requestId: string;
  amount: string;
  netBankAmount: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'exported' | 'paid';
  requestedAt: string;
};

type DirectReferralSummary = {
  memberId: string;
  memberCode: string;
  name: string;
  childCount: number;
};

type DirectReferralsResponse = {
  directReferrals?: DirectReferralSummary[];
};

type MatrixBoardSummary = {
  boardNo?: number;
  boardId?: string;
  roundNo?: number;
  slotCount?: number;
  filledSlots?: number;
  openThresholdPv?: string;
  accumulatedPv?: string;
  status?: string;
  positions?: MatrixPositionSummary[];
};

type MatrixPositionSummary = {
  positionId?: string;
  slotNo?: number;
  levelNo?: number;
  roundNo?: number;
  parentSlotNo?: number | null;
  sourceUserId?: string | null;
  sourceMemberCode?: string | null;
  sourceMemberName?: string | null;
  sourcePv?: string;
  creditedPv?: string;
  status?: string;
  assignedAt?: string;
};

type MatrixCycleSummary = {
  cycleId?: string;
  userId?: string;
  cycleNo?: number;
  boardWidth?: number;
  boardDepth?: number;
  boardCount?: number;
  organizationPvRate?: string;
  cwReentryAmount?: string;
  personalCarryPv?: string;
  levelRatesSnapshot?: string[];
  totalAccumulatedPv?: string;
  currentBoardNo?: number;
  currentBoardRoundNo?: number;
  status?: string;
  startedAt?: string;
  completedAt?: string | null;
  boards?: MatrixBoardSummary[];
};

type MatrixResponse = {
  reentryEnabled?: boolean;
  cycles?: MatrixCycleSummary[];
};

type MatrixPayoutSummary = {
  payoutId: string;
  beneficiaryUserId: string;
  amount: string;
  status: string;
  createdAt: string;
};

type MatrixSettingsResponse = {
  boardOpenPvThresholds?: string[];
};

type MatrixMemberResponse = {
  cycles?: MatrixCycleSummary[];
};

type AuthMeResponse = {
  user?: {
    userId?: string;
    memberCode?: string;
    matrixReentryEnabled?: boolean;
  };
};

type DashboardMetrics = {
  cwToday: string;
  cwTotal: string;
  sw: string;
  swReentryTarget: string;
  withdrawPending: string;
  dcw: string;
  firm: string;
};

const defaultMetrics: DashboardMetrics = {
  cwToday: '0.00',
  cwTotal: '0.00',
  sw: '0.00',
  swReentryTarget: '0.00',
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

const normalizePositiveInteger = (value?: number, fallback = 2): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  return normalized > 0 ? normalized : fallback;
};

const resolveActiveMatrixCycle = (
  matrixResponse?: MatrixResponse,
): MatrixCycleSummary | undefined => {
  return (
    matrixResponse?.cycles?.find(cycle => cycle.status?.toLowerCase() === 'active') ||
    matrixResponse?.cycles?.[0]
  );
};

const canRequestManualReentry = (cycle?: MatrixCycleSummary): boolean => {
  if (!cycle || cycle.status?.toLowerCase() !== 'active') {
    return false;
  }

  const boards = cycle.boards || [];

  return boards.some(board => {
    if (board.boardNo !== 1 || board.status?.toLowerCase() !== 'completed') {
      return false;
    }

    const nextRoundNo = (board.roundNo || 0) + 1;
    return !boards.some(
      entry => entry.boardNo === 1 && entry.roundNo === nextRoundNo,
    );
  });
};

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
    case 'uni':
      return 'Unilevel';
    case 'pool':
      return 'Pool';
    case 'cashback':
      return 'Cashback';
    default:
      return 'Commission';
  }
};

const toStartOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
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

const resolveReentryTarget = (
  matrixResponse?: MatrixResponse,
  matrixSettings?: MatrixSettingsResponse,
): number => {
  const activeCycle =
    matrixResponse?.cycles?.find(cycle => cycle.status?.toLowerCase() === 'active') ||
    matrixResponse?.cycles?.[0];

  const activeBoard = activeCycle?.boards?.find(
    board => board.boardNo === activeCycle.currentBoardNo,
  );

  if (activeBoard) {
    const openThresholdPv = parseDecimal(activeBoard.openThresholdPv);
    const accumulatedPv = parseDecimal(activeBoard.accumulatedPv);
    return Math.max(openThresholdPv - accumulatedPv, 0);
  }

  return Math.max(parseDecimal(matrixSettings?.boardOpenPvThresholds?.[0]), 0);
};

const dashboardTiles = (
  metrics: DashboardMetrics,
) => [
  {
    key: 'cw-today',
    title: 'CW วันนี้',
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
    'cw-convert' | 'cw-today' | 'dcw' | 'top-leader' | null
  >(null);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertMessage, setConvertMessage] = useState('');
  const [convertError, setConvertError] = useState('');
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [matrixData, setMatrixData] = useState<MatrixResponse>({cycles: []});
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  );
  const [selectedMatrixBoard, setSelectedMatrixBoard] = useState<{
    cycleNo: number;
    board: MatrixBoardSummary;
  } | null>(null);
  const [visibility, setVisibility] = useState<Record<CommissionKey, boolean>>({
    cashback: true,
    direct: true,
    unilevel: true,
    matrix: true,
    pool: true,
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
        matrixSettingsResult,
        dashboardResult,
        commissionsResult,
        matrixResult,
        transactionsResult,
        withdrawRequestsResult,
        matrixPayoutsResult,
      ] = await Promise.allSettled([
        axios.get<CommissionSettingsResponse>(URLS.GET_COMMISSION_SETTINGS),
        axios.get<MatrixSettingsResponse>(URLS.GET_MATRIX_SETTINGS),
        axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, authRequestConfig),
        fetchAllCommissions(),
        axios.get<MatrixResponse>(URLS.AUTH_MATRIX, authRequestConfig),
        axios.get<WalletTransactionSummary[]>(URLS.AUTH_TRANSACTIONS, authRequestConfig),
        axios.get<WithdrawRequestSummary[]>(URLS.AUTH_WITHDRAW_REQUESTS, authRequestConfig),
        user?.userId
          ? axios.get<MatrixPayoutSummary[]>(
              `${URLS.API_BASE_URL}/matrix/payouts?beneficiaryUserId=${user.userId}`,
              {withCredentials: true},
            )
          : Promise.resolve({data: [] as MatrixPayoutSummary[]}),
      ]);

      if (commissionSettingsResult.status === 'fulfilled') {
        setVisibility({
          cashback:
            commissionSettingsResult.value.data.appVisibility?.cashback !== false,
          direct: commissionSettingsResult.value.data.appVisibility?.direct !== false,
          unilevel:
            commissionSettingsResult.value.data.appVisibility?.unilevel !== false,
          matrix: commissionSettingsResult.value.data.appVisibility?.matrix !== false,
          pool: commissionSettingsResult.value.data.appVisibility?.pool !== false,
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
      const matrixPayload =
        matrixResult.status === 'fulfilled' ? matrixResult.value.data : undefined;
      let resolvedMatrixData: MatrixResponse = matrixPayload || {cycles: []};

      if (!(resolvedMatrixData.cycles || []).length && user?.memberCode) {
        try {
          const memberMatrix = await axios.get<MatrixMemberResponse>(
            URLS.buildMatrixByMemberCodeUrl(user.memberCode),
            {withCredentials: true},
          );
          resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      }

      if (!(resolvedMatrixData.cycles || []).length && user?.userId) {
        try {
          const memberMatrix = await axios.get<MatrixMemberResponse>(
            URLS.buildMatrixByMemberIdUrl(user.userId),
            {withCredentials: true},
          );
          resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      }

      if (!(resolvedMatrixData.cycles || []).length) {
        try {
          const meResult = await axios.get<AuthMeResponse>(URLS.AUTH_ME, {
            withCredentials: true,
          });
          const meUserId = meResult.data.user?.userId;
          const meMemberCode = meResult.data.user?.memberCode;

          if (meMemberCode) {
            const memberMatrix = await axios.get<MatrixMemberResponse>(
              URLS.buildMatrixByMemberCodeUrl(meMemberCode),
              {withCredentials: true},
            );
            resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
          } else if (meUserId) {
            const memberMatrix = await axios.get<MatrixMemberResponse>(
              URLS.buildMatrixByMemberIdUrl(meUserId),
              {withCredentials: true},
            );
            resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
          }
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      }

      setMatrixData(resolvedMatrixData);

      const matrixSettings =
        matrixSettingsResult.status === 'fulfilled'
          ? matrixSettingsResult.value.data
          : undefined;

      const startOfToday = toStartOfToday();
      const todayCommissionTotal = commissions.reduce((sum, entry) => {
        if (entry.status?.toLowerCase() === 'fallback' || !entry.createdAt) {
          return sum;
        }

        const createdAt = new Date(entry.createdAt).getTime();

        if (Number.isNaN(createdAt) || createdAt < startOfToday) {
          return sum;
        }

        return sum + parseDecimal(entry.amount);
      }, 0);

      const matrixPayouts =
        matrixPayoutsResult.status === 'fulfilled'
          ? matrixPayoutsResult.value.data
          : [];

      const todayMatrixTotal = matrixPayouts.reduce((sum, payout) => {
        const createdAt = new Date(payout.createdAt || '').getTime();

        if (Number.isNaN(createdAt) || createdAt < startOfToday) {
          return sum;
        }

        return sum + parseDecimal(payout.amount);
      }, 0);

      const cwToday = todayCommissionTotal + todayMatrixTotal;

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
      const activeCycle = resolveActiveMatrixCycle(resolvedMatrixData);
      const reentryTarget = activeCycle
        ? parseDecimal(activeCycle.cwReentryAmount)
        : resolveReentryTarget(resolvedMatrixData, matrixSettings);
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

      setMetrics({
        cwToday: formatDecimal(cwToday),
        cwTotal: formatDecimal(parseDecimal(wallet?.withdrawableBalance)),
        sw: formatDecimal(swBalance),
        swReentryTarget: formatDecimal(reentryTarget),
        withdrawPending: formatDecimal(pendingWithdrawTotal),
        dcw: formatDecimal(parseDecimal(wallet?.discountBalance)),
        firm: formatDecimal(parseDecimal(wallet?.firmBalance)),
      });

    } catch (error) {
      console.error(error);
      setMetrics(defaultMetrics);
      setMatrixData({cycles: []});
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
  const isTabletViewport = viewportWidth >= 768 && viewportWidth < 1180;
  const matrixBoardWidth = isMobileViewport
    ? 'calc((100% - 22px) / 2.2)'
    : isTabletViewport
      ? '168px'
      : '196px';
  const activeCycle = useMemo(
    () => resolveActiveMatrixCycle(matrixData),
    [matrixData],
  );
  const reentryEligible = useMemo(
    () => canRequestManualReentry(activeCycle),
    [activeCycle],
  );
  const autoOrderAmount = useMemo(
    () => parseDecimal(activeCycle?.cwReentryAmount || metrics.swReentryTarget),
    [activeCycle?.cwReentryAmount, metrics.swReentryTarget],
  );

  const cwAvailableForDisplay = useMemo(() => {
    return Math.max(parseDecimal(metrics.cwTotal), 0);
  }, [metrics.cwTotal]);

  const autoOrderReady = useMemo(() => {
    return (
      reentryEligible &&
      autoOrderAmount > 0 &&
      cwAvailableForDisplay >= autoOrderAmount
    );
  }, [autoOrderAmount, cwAvailableForDisplay, reentryEligible]);
  const matrixPvHoldAmount = useMemo(() => {
    return Math.max(parseDecimal(activeCycle?.personalCarryPv), 0);
  }, [activeCycle?.personalCarryPv]);

  const cwRecentEntries = useMemo(() => {
    return commissionEntries
      .filter(entry => isWithinLastDays(entry.createdAt, 5))
      .sort((left, right) => {
        return (
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime()
        );
      });
  }, [commissionEntries]);

  const cashbackEntries = useMemo(() => {
    return commissionEntries
      .filter(entry => entry.commissionType?.toLowerCase() === 'cashback')
      .sort(
        (left, right) =>
          new Date(right.createdAt || 0).getTime() -
          new Date(left.createdAt || 0).getTime(),
      );
  }, [commissionEntries]);

  const directEntries = useMemo(() => {
    return commissionEntries
      .filter(entry => entry.commissionType?.toLowerCase() === 'direct')
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

    (matrixData.cycles || []).forEach(cycle => {
      (cycle.boards || []).forEach(board => {
        (board.positions || []).forEach(position => {
          if (position.sourceUserId) {
            directory.set(position.sourceUserId, {
              memberCode: position.sourceMemberCode || undefined,
              name: position.sourceMemberName || undefined,
            });
          }
        });
      });
    });

    return directory;
  }, [directReferrals, matrixData]);

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

  const tiles = dashboardTiles({
    ...metrics,
    cwTotal: formatDecimal(cwAvailableForDisplay),
  });

  const renderCommissionSummaryCard = () => {
    if (!selectedCard || selectedCard.key === 'matrix') {
      return null;
    }

    if (selectedCard.key === 'cashback') {
      return (
        <section style={{display: 'grid', gap: 12}}>
          <div
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
              รวม {formatDecimal(cashbackTotal)}
            </h3>
            <p style={{margin: 0, color: theme.colors.textColor, lineHeight: 1.6}}>
              รายการ cashback ทั้งหมด {cashbackEntries.length} รายการ
            </p>
          </div>

          {cashbackEntries.slice(0, 5).map(entry => (
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
                  Cashback
                </div>
                <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                  {formatDecimal(parseDecimal(entry.amount))}
                </div>
              </div>
              <div style={{color: theme.colors.textColor, lineHeight: 1.6}}>
                <div>เวลา: {formatDateTime(entry.createdAt)}</div>
                <div>สถานะ: {entry.status || '-'}</div>
              </div>
            </article>
          ))}

          {!cashbackEntries.length ? (
            <div style={{color: theme.colors.textColor}}>ยังไม่มีรายการ cashback</div>
          ) : null}
        </section>
      );
    }

    if (selectedCard.key === 'direct') {
      return (
        <section style={{display: 'grid', gap: 12}}>
          <div
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
              รวม {formatDecimal(directTotal)}
            </h3>
            <p style={{margin: 0, color: theme.colors.textColor, lineHeight: 1.6}}>
              สมาชิกสายตรง {directReferrals.length} คน · รายการ direct {directEntries.length} รายการ
            </p>
          </div>

          {directReferrals.length ? (
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

          {directEntries.slice(0, 5).map(entry => (
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
                  Direct {entry.levelNo ? `L${entry.levelNo}` : ''}
                </div>
                <div style={{color: theme.colors.mainColor, ...theme.fonts.Mulish_700Bold}}>
                  {formatDecimal(parseDecimal(entry.amount))}
                </div>
              </div>
              <div style={{color: theme.colors.textColor, lineHeight: 1.6}}>
                <div>เวลา: {formatDateTime(entry.createdAt)}</div>
                <div>สถานะ: {entry.status || '-'}</div>
              </div>
            </article>
          ))}

          {!directEntries.length && !directReferrals.length ? (
            <div style={{color: theme.colors.textColor}}>ยังไม่มีข้อมูล direct</div>
          ) : null}
        </section>
      );
    }

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
            {selectedCard.value}
          </h3>
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              lineHeight: 1.6,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            {selectedCard.note}
          </p>
        </div>
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
      setDetailPanel('cw-today');
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
      setDetailPanel('cw-convert');
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
      setConvertError('จำนวนที่เปลี่ยนต้องไม่เกิน CW คงเหลือ');
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
      setConvertMessage(
        `เปลี่ยน CW เป็น SW สำเร็จ ได้รับ SW ${formatDecimal(
          parseDecimal(response.data?.netShoppingAmount),
        )}`,
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

  const getBoardLevelCapacity = (cycle: MatrixCycleSummary, levelNo: number) => {
    const boardWidth = normalizePositiveInteger(cycle.boardWidth, 2);
    return Math.max(1, Math.pow(boardWidth, levelNo));
  };

  const getBoardLevelRows = (cycle: MatrixCycleSummary, board: MatrixBoardSummary) => {
    const boardDepth = normalizePositiveInteger(cycle.boardDepth, 2);

    return Array.from({length: boardDepth}, (_, index) => {
      const levelNo = index + 1;
      const positions = (board.positions || []).filter(
        position => position.levelNo === levelNo,
      );
      const capacity = getBoardLevelCapacity(cycle, levelNo);
      const filled = positions.length;
      const percent = Math.max(0, Math.min(100, (filled / capacity) * 100));

      return {
        levelNo,
        capacity,
        filled,
        percent,
        positions,
      };
    });
  };

const getBoardStatusLabel = (board: MatrixBoardSummary) => {
  if (board.status?.toLowerCase() === 'completed') {
    return 'Complete';
  }

  if (
    board.status?.toLowerCase() === 'active' ||
    board.status?.toLowerCase() === 'open'
  ) {
    return 'Active';
  }

  if (board.status?.toLowerCase() === 'locked') {
    return 'Locked';
  }

  return 'Wait';
};

  const renderMatrixBoardCard = (
    cycle: MatrixCycleSummary,
    board: MatrixBoardSummary,
    widthOverride?: string,
  ): JSX.Element => {
    const levelRows = getBoardLevelRows(cycle, board);
    const statusLabel = getBoardStatusLabel(board);
    const isComplete = statusLabel === 'Complete';
    const isActive = statusLabel === 'Active';
    const boardTitle = `Board ${board.boardNo || 1}`;
    const roundLabel = `Round ${board.roundNo || 1}`;

    return (
      <button
        key={`${cycle.cycleId}-${board.boardId}`}
        onClick={() => setSelectedMatrixBoard({cycleNo: cycle.cycleNo || 1, board})}
        style={{
          border: 'none',
          textAlign: 'left',
          borderRadius: 16,
          padding: isMobileViewport ? 6 : 11,
          cursor: 'pointer',
          background:
            'linear-gradient(180deg, rgba(96,126,218,0.96) 0%, rgba(96,126,218,0.90) 100%)',
          boxShadow: '0 12px 24px rgba(47, 74, 156, 0.22)',
          color: '#FFFFFF',
          display: 'grid',
          gap: isMobileViewport ? 6 : 8,
          width: widthOverride || matrixBoardWidth,
          minWidth: widthOverride || matrixBoardWidth,
          flex: '0 0 auto',
          overflow: 'hidden',
          scrollSnapAlign: 'start',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  width: isMobileViewport ? 9 : 11,
                  height: isMobileViewport ? 9 : 11,
                  borderRadius: '50%',
                  backgroundColor: '#8CF369',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.12)',
                }}
              />
              <strong
              style={{
                fontSize: isMobileViewport ? 9 : 10,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
                S Size
              </strong>
            </div>
            <div
              style={{
                fontSize: isMobileViewport ? 8 : 9,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              {formatDecimal(parseDecimal(board.openThresholdPv))}
              {' '}point
            </div>
          </div>

          <div style={{textAlign: 'right'}}>
            <div
              style={{
                fontSize: isMobileViewport ? 10 : 11,
                ...theme.fonts.Mulish_700Bold,
                marginBottom: isMobileViewport ? 2 : 4,
              }}
            >
              {boardTitle}
            </div>
            <div
              style={{
                fontSize: isMobileViewport ? 8 : 9,
                ...theme.fonts.Mulish_600SemiBold,
                opacity: 0.92,
              }}
            >
              {roundLabel}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: isMobileViewport ? 6 : 10,
            maxHeight: isMobileViewport ? 102 : 172,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
            {levelRows.map(level => (
            <div key={`${board.boardId}-level-${level.levelNo}`}>
              <div
                style={{
                  marginBottom: isMobileViewport ? 4 : 6,
                  fontSize: isMobileViewport ? 8 : 10,
                  ...theme.fonts.Mulish_600SemiBold,
                }}
              >
                Level {level.levelNo} ({level.filled}/{level.capacity})
              </div>
              <div
                style={{
                  width: '100%',
                  height: isMobileViewport ? 9 : 14,
                  borderRadius: 999,
                  overflow: 'hidden',
                  backgroundColor: 'rgba(28, 56, 123, 0.78)',
                }}
              >
                <div
                  style={{
                    width: `${level.percent}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: '#C8EDFF',
                    transition: 'width 0.25s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            borderRadius: 14,
            padding: isMobileViewport ? '5px 7px' : '8px 10px',
            textAlign: 'center',
            backgroundColor: isComplete
              ? 'rgba(58, 85, 150, 0.95)'
              : isActive
                ? 'rgba(25, 73, 151, 0.95)'
                : 'rgba(58, 85, 150, 0.95)',
            fontSize: isMobileViewport ? 9 : 11,
            ...theme.fonts.Mulish_700Bold,
          }}
        >
          {statusLabel}
        </div>
      </button>
    );
  };

  const renderMatrixBoards = (): JSX.Element => {
    const cycles = matrixData.cycles || [];

    if (!cycles.length) {
      return (
        <section
          style={{
            padding: 18,
            borderRadius: 16,
            backgroundColor: theme.colors.white,
            border: `1px solid ${theme.colors.aliceBlue2}`,
          }}
        >
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            ยังไม่มีข้อมูล matrix board ในระบบ
          </p>
        </section>
      );
    }

    return (
      <section style={{display: 'grid', gap: 26}}>
        {cycles.map(cycle => {
          const orderedBoards = [...(cycle.boards || [])]
            .filter(board => board.status?.toLowerCase() !== 'locked')
            .sort((left, right) => {
              const leftBoard = left.boardNo || 0;
              const rightBoard = right.boardNo || 0;

              if (leftBoard !== rightBoard) {
                return leftBoard - rightBoard;
              }

              return (left.roundNo || 0) - (right.roundNo || 0);
            });
          const roundRows = orderedBoards.reduce<Array<{
            roundNo: number;
            boards: MatrixBoardSummary[];
          }>>((rows, board) => {
            const roundNo = board.roundNo || 1;
            const existingRow = rows.find(row => row.roundNo === roundNo);

            if (existingRow) {
              existingRow.boards.push(board);
            } else {
              rows.push({roundNo, boards: [board]});
            }

            return rows;
          }, []);

          return (
            <section
              key={cycle.cycleId}
              style={{
                borderRadius: 28,
                padding: isMobileViewport ? 14 : 18,
                background: 'linear-gradient(180deg, #5B9DE0 0%, #4D8FD6 100%)',
                border: '4px solid #35699E',
                boxShadow: '0 20px 40px rgba(53, 105, 158, 0.18)',
                overflow: 'visible',
              }}
            >
              {/* Mobile matrix layout contract:
                  - boards are grouped by round, with Round 2 rendered on its own row beneath Round 1
                  - rows are left-aligned by default to match the approved WAP layout
                  - a row with exactly 3 visible boards should fill the row width on mobile
                  - the cycle summary header above the rows is intentionally hidden to avoid duplicate labels
              */}
              <div style={{display: 'grid', gap: 12}}>
                {roundRows.map(row => (
                  <div key={`${cycle.cycleId}-round-${row.roundNo}`}>
                    {(() => {
                      const rowGap = isMobileViewport ? 6 : 8;
                      const rowCardWidth =
                        isMobileViewport
                          ? row.boards.length >= 3
                            ? `calc((100% - ${rowGap * 2}px) / 3)`
                            : undefined
                          : undefined;

                      return (
                    <div
                      style={{
                        display: 'grid',
                        gap: 10,
                        padding: isMobileViewport ? 10 : 14,
                        borderRadius: 24,
                        background: 'rgba(104, 139, 220, 0.22)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                      }}
                    >
                      {roundRows.length > 1 ? (
                        <div
                          style={{
                            color: 'rgba(255,255,255,0.96)',
                            fontSize: isMobileViewport ? 11 : 12,
                            textAlign: 'center',
                            ...theme.fonts.Mulish_700Bold,
                          }}
                        >
                          Round {row.roundNo}
                        </div>
                      ) : null}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: isMobileViewport ? 6 : 8,
                          alignItems: 'stretch',
                          justifyContent: 'flex-start',
                        }}
                      >
                        {row.boards.map(board =>
                          renderMatrixBoardCard(cycle, board, rowCardWidth),
                        )}
                      </div>
                    </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    );
  };

  const renderMatrixBoardModal = (): JSX.Element | null => {
    if (!selectedMatrixBoard) {
      return null;
    }

    const cycles = matrixData.cycles || [];

    const cycle = cycles.find(
      entry => entry.cycleNo === selectedMatrixBoard.cycleNo,
    );

    if (!cycle) {
      return null;
    }

    const rows = getBoardLevelRows(cycle, selectedMatrixBoard.board);

    return (
      <div
        onClick={() => setSelectedMatrixBoard(null)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
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
            <div>
              <h3
                style={{
                  margin: '0 0 6px',
                  color: theme.colors.mainColor,
                  fontSize: 26,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                รอบ {cycle.cycleNo} / Board {selectedMatrixBoard.board.boardNo}
              </h3>
              <p
                style={{
                  margin: 0,
                  color: theme.colors.textColor,
                  ...theme.fonts.Mulish_400Regular,
                }}
              >
                รายชื่อสมาชิกตามชั้นของกระดานนี้
              </p>
            </div>

            <button
              onClick={() => setSelectedMatrixBoard(null)}
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

          <div style={{display: 'grid', gap: 16}}>
            {rows.map(level => (
              <section
                key={`modal-level-${level.levelNo}`}
                style={{
                  border: `1px solid ${theme.colors.aliceBlue2}`,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    marginBottom: 10,
                    color: theme.colors.mainColor,
                    fontSize: 18,
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  Level {level.levelNo} ({level.filled}/{level.capacity})
                </div>

                {level.positions.length === 0 ? (
                  <div
                    style={{
                      color: theme.colors.textColor,
                      ...theme.fonts.Mulish_400Regular,
                    }}
                  >
                    ยังไม่มีสมาชิกลงจุดในชั้นนี้
                  </div>
                ) : (
                  <div style={{display: 'grid', gap: 10}}>
                    {level.positions.map(position => (
                      <div
                        key={position.positionId}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: '#F7FAFC',
                          border: `1px solid ${theme.colors.aliceBlue2}`,
                        }}
                      >
                        <div
                          style={{
                            color: theme.colors.mainColor,
                            ...theme.fonts.Mulish_700Bold,
                            marginBottom: 4,
                          }}
                        >
                          จุด {position.slotNo} · {position.sourceMemberCode || '-'}
                        </div>
                        <div
                          style={{
                            color: theme.colors.textColor,
                            ...theme.fonts.Mulish_400Regular,
                            lineHeight: 1.6,
                          }}
                        >
                          <div>ชื่อ: {position.sourceMemberName || '-'}</div>
                          <div>PV: {formatDecimal(parseDecimal(position.creditedPv || position.sourcePv))}</div>
                          <div>เวลา: {position.assignedAt ? new Date(position.assignedAt).toLocaleString('th-TH') : '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderDetailPanel = (): JSX.Element | null => {
    if (!detailPanel) {
      return null;
    }

    let title = '';
    let content: JSX.Element | null = null;

    if (detailPanel === 'cw-convert') {
      title = 'เปลี่ยน CW เป็น SW';
      content = (
        <div style={{display: 'grid', gap: 14}}>
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
            }}
          >
            <div style={{marginBottom: 6, color: theme.colors.textColor}}>CW ที่ใช้ได้</div>
            <div
              style={{
                color: theme.colors.mainColor,
                fontSize: 24,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {formatDecimal(cwAvailableForDisplay)}
            </div>
            <div style={{marginTop: 8, color: theme.colors.textColor}}>
              {autoOrderReady
                ? `ครบเงื่อนไขแล้ว ระบบจะใช้ CW ${formatDecimal(autoOrderAmount)} สำหรับ Auto Order รอบถัดไป`
                : `ระบบเตรียม Auto Order ไว้ที่ CW ${formatDecimal(autoOrderAmount)} และจะใช้เมื่อ Board 1 ครบตามกติกา`}
            </div>
            <div
              style={{
                marginTop: 8,
                color: theme.colors.textColor,
                opacity: 0.76,
                lineHeight: 1.5,
              }}
            >
              CW ก้อนนี้คือยอดคงเหลือที่ระบบจะใช้สำหรับ Auto Order ตามกติกา matrix
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
    }

    if (detailPanel === 'cw-today') {
      title = 'ค่าคอมมิชชั่นย้อนหลัง 5 วัน';
      content = cwRecentEntries.length ? (
        <div
          style={{
            display: 'grid',
            gap: 12,
            maxHeight: '58vh',
            overflowY: 'auto',
            paddingRight: 4,
          }}
        >
          {cwRecentEntries.map(entry => {
            const {date, time} = formatDateParts(entry.createdAt);
            const member = entry.sourceUserId
              ? memberDirectory.get(entry.sourceUserId)
              : undefined;
            const code = member?.memberCode || entry.orderId || entry.sourceUserId || '-';

            return (
              <article
                key={entry.commissionId || `${entry.createdAt}-${entry.amount}`}
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
                  รหัส: <strong style={{color: theme.colors.mainColor}}>{code}</strong>
                </div>

                <div style={{color: theme.colors.textColor}}>
                  ประเภท:{' '}
                  <strong style={{color: theme.colors.mainColor}}>
                    {getCommissionTypeLabel(entry.commissionType)}
                    {entry.levelNo ? ` L${entry.levelNo}` : ''}
                  </strong>
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
                      color: theme.colors.mainColor,
                      maxWidth: '55%',
                      overflowX: 'auto',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                    }}
                  >
                    {formatDecimal(parseDecimal(entry.amount))}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div style={{color: theme.colors.textColor}}>
          ยังไม่มีรายการค่าคอมมิชชั่นย้อนหลัง 5 วัน
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
                <div
                  style={{
                    display: 'grid',
                    justifyItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      color: '#64748B',
                      fontSize: 10,
                      lineHeight: 1,
                      textTransform: 'uppercase',
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    Auto Order
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gap: 2,
                      justifyItems: 'center',
                      borderRadius: 999,
                      padding: '8px 14px',
                      backgroundColor: autoOrderReady ? '#16A34A' : '#E2E8F0',
                      color: autoOrderReady ? '#FFFFFF' : '#334155',
                      minWidth: 112,
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    <span>CW {formatDecimal(autoOrderAmount)}</span>
                    <span
                      style={{
                        fontSize: 10,
                        lineHeight: 1.1,
                        opacity: autoOrderReady ? 0.86 : 0.72,
                        ...theme.fonts.Mulish_400Regular,
                      }}
                    >
                      {autoOrderReady ? 'พร้อมใช้' : 'รอครบเงื่อนไข'}
                    </span>
                  </div>
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

        {selectedCard?.key === 'matrix' ? (
          <>
            <section
              style={{
                marginBottom: 14,
                padding: '14px 16px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '1px solid #BFDBFE',
                boxShadow: '0 12px 24px rgba(59, 130, 246, 0.10)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      color: '#1E3A8A',
                      fontSize: 12,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    PV Hold
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      color: theme.colors.textColor,
                      fontSize: 12,
                      lineHeight: 1.5,
                      ...theme.fonts.Mulish_400Regular,
                    }}
                  >
                    PV สะสมที่รอใช้เปิดจุดถัดไปตามกติกา matrix
                  </div>
                </div>
                <div
                  style={{
                    color: '#1D4ED8',
                    fontSize: 26,
                    lineHeight: 1,
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  {formatDecimal(matrixPvHoldAmount)}
                </div>
              </div>
            </section>
            {renderMatrixBoards()}
          </>
        ) : null}

        {selectedCard && selectedCard.key !== 'matrix'
          ? renderCommissionSummaryCard()
          : null}

        {renderMatrixBoardModal()}
        {renderDetailPanel()}
      </main>
    </>
  );
};
