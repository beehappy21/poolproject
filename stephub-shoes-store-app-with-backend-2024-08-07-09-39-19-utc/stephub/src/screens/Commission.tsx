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

const LOCAL_MATRIX_FALLBACK_MEMBER_CODE = 'TH0000013';
const LOCAL_MATRIX_DEV_FALLBACK_DATA: MatrixResponse = {
  cycles: [
    {
      cycleId: '15',
      userId: '33',
      cycleNo: 1,
      boardWidth: 3,
      boardDepth: 3,
      boardCount: 3,
      organizationPvRate: '700',
      cwReentryAmount: '700',
      personalCarryPv: '0',
      levelRatesSnapshot: [],
      totalAccumulatedPv: '4200',
      currentBoardNo: 1,
      currentBoardRoundNo: 1,
      status: 'active',
      startedAt: '2026-03-26T11:30:04.078Z',
      completedAt: null,
      boards: [
        {
          boardId: '37',
          boardNo: 1,
          roundNo: 1,
          slotCount: 39,
          filledSlots: 6,
          openThresholdPv: '700',
          accumulatedPv: '4200',
          status: 'open',
          positions: [
            {
              positionId: '10',
              slotNo: 1,
              levelNo: 1,
              roundNo: 1,
              parentSlotNo: null,
              sourceUserId: '36',
              sourceMemberCode: 'TH0000016',
              sourceMemberName: 'สุวัฒน์ วังวรตระกูล',
              sourcePv: '700',
              creditedPv: '700',
              status: 'filled',
              assignedAt: '2026-03-26T11:30:04.970Z',
            },
            {
              positionId: '11',
              slotNo: 2,
              levelNo: 1,
              roundNo: 1,
              parentSlotNo: null,
              sourceUserId: '37',
              sourceMemberCode: 'TH0000017',
              sourceMemberName: 'วทัญญู  วงษ์ทะ',
              sourcePv: '700',
              creditedPv: '700',
              status: 'filled',
              assignedAt: '2026-03-26T11:30:05.968Z',
            },
            {
              positionId: '13',
              slotNo: 3,
              levelNo: 1,
              roundNo: 1,
              parentSlotNo: null,
              sourceUserId: '40',
              sourceMemberCode: 'TH0000020',
              sourceMemberName: 'ธันยาดา จินันทุยา',
              sourcePv: '700',
              creditedPv: '700',
              status: 'filled',
              assignedAt: '2026-03-26T11:30:06.730Z',
            },
            {
              positionId: '15',
              slotNo: 4,
              levelNo: 2,
              roundNo: 1,
              parentSlotNo: 1,
              sourceUserId: '43',
              sourceMemberCode: 'TH0000023',
              sourceMemberName: 'พุฒิพงศ์ อัจฉริยะสมบัติ',
              sourcePv: '700',
              creditedPv: '700',
              status: 'filled',
              assignedAt: '2026-03-26T11:30:07.519Z',
            },
            {
              positionId: '17',
              slotNo: 5,
              levelNo: 2,
              roundNo: 1,
              parentSlotNo: 1,
              sourceUserId: '51',
              sourceMemberCode: 'TH0000031',
              sourceMemberName: 'มณีวรรณ์  กันทะวงค์',
              sourcePv: '700',
              creditedPv: '700',
              status: 'filled',
              assignedAt: '2026-03-26T11:30:08.272Z',
            },
            {
              positionId: '19',
              slotNo: 6,
              levelNo: 2,
              roundNo: 1,
              parentSlotNo: 1,
              sourceUserId: '52',
              sourceMemberCode: 'TH0000032',
              sourceMemberName: 'นุกวิญ เล',
              sourcePv: '700',
              creditedPv: '700',
              status: 'filled',
              assignedAt: '2026-03-26T11:30:09.022Z',
            },
          ],
        },
        {
          boardId: '38',
          boardNo: 2,
          roundNo: 1,
          slotCount: 39,
          filledSlots: 0,
          openThresholdPv: '700',
          accumulatedPv: '0',
          status: 'locked',
          positions: [],
        },
        {
          boardId: '39',
          boardNo: 3,
          roundNo: 1,
          slotCount: 39,
          filledSlots: 0,
          openThresholdPv: '700',
          accumulatedPv: '0',
          status: 'locked',
          positions: [],
        },
      ],
    },
  ],
};

type CommissionKey = (typeof commissionCards)[number]['key'];

type CommissionSettingsResponse = {
  appVisibility?: Record<CommissionKey, boolean | undefined>;
};

type WalletSummary = {
  approvedBalance?: string;
  withdrawableBalance?: string;
  shoppingBalance?: string;
  discountBalance?: string;
};

type DashboardResponse = {
  wallet?: WalletSummary;
};

type CommissionEntry = {
  amount?: string;
  status?: string;
  createdAt?: string;
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
  cycles?: MatrixCycleSummary[];
};

type MatrixSettingsResponse = {
  boardOpenPvThresholds?: string[];
};

type MemberLookupResponse = {
  memberId?: string;
  userId?: string;
  memberCode?: string;
  name?: string;
};

type MatrixMemberResponse = {
  cycles?: MatrixCycleSummary[];
};

type AuthMeResponse = {
  user?: {
    userId?: string;
    memberCode?: string;
  };
};

type DashboardMetrics = {
  cwToday: string;
  cwTotal: string;
  sw: string;
  swReentryTarget: string;
  withdraw: string;
  dcw: string;
};

const defaultMetrics: DashboardMetrics = {
  cwToday: '0.00',
  cwTotal: '0.00',
  sw: '0.00',
  swReentryTarget: '0.00',
  withdraw: '0.00',
  dcw: '0.00',
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

const toStartOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
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
    title: 'Withdraw',
    value: metrics.withdraw,
  },
  {
    key: 'sw-transfer',
    title: 'โอน SW',
    value: metrics.sw,
  },
  {
    key: 'dcw',
    title: 'DCW',
    value: metrics.dcw,
  },
  {
    key: 'top-leader',
    title: 'Top leader',
    value: 'TOP 10',
  },
];

export const Commission: React.FC = () => {
  const navigate = useNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<CommissionKey | null>(null);
  const [swReentryEnabled, setSwReentryEnabled] = useState(false);
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

    try {
      const [
        commissionSettingsResult,
        matrixSettingsResult,
        dashboardResult,
        commissionsResult,
        matrixResult,
      ] = await Promise.allSettled([
        axios.get<CommissionSettingsResponse>(URLS.GET_COMMISSION_SETTINGS),
        axios.get<MatrixSettingsResponse>(URLS.GET_MATRIX_SETTINGS),
        axios.get<DashboardResponse>(URLS.AUTH_DASHBOARD, authRequestConfig),
        axios.get<CommissionEntry[]>(URLS.AUTH_COMMISSIONS, authRequestConfig),
        axios.get<MatrixResponse>(URLS.AUTH_MATRIX, authRequestConfig),
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

      const commissions =
        commissionsResult.status === 'fulfilled' ? commissionsResult.value.data : [];
      const matrixPayload =
        matrixResult.status === 'fulfilled' ? matrixResult.value.data : undefined;
      let resolvedMatrixData: MatrixResponse = matrixPayload || {cycles: []};

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

      if (!(resolvedMatrixData.cycles || []).length && user?.memberCode) {
        try {
          const memberLookup = await axios.get<MemberLookupResponse>(
            URLS.buildMemberByCodeUrl(user.memberCode),
            {withCredentials: true},
          );
          const fallbackMemberId = memberLookup.data.memberId || memberLookup.data.userId;

          if (fallbackMemberId) {
            const memberMatrix = await axios.get<MatrixMemberResponse>(
              URLS.buildMatrixByMemberIdUrl(fallbackMemberId),
              {withCredentials: true},
            );
            resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
          }
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

          if (meUserId) {
            const memberMatrix = await axios.get<MatrixMemberResponse>(
              URLS.buildMatrixByMemberIdUrl(meUserId),
              {withCredentials: true},
            );
            resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
          } else if (meMemberCode) {
            const memberLookup = await axios.get<MemberLookupResponse>(
              URLS.buildMemberByCodeUrl(meMemberCode),
              {withCredentials: true},
            );
            const fallbackMemberId =
              memberLookup.data.memberId || memberLookup.data.userId;

            if (fallbackMemberId) {
              const memberMatrix = await axios.get<MatrixMemberResponse>(
                URLS.buildMatrixByMemberIdUrl(fallbackMemberId),
                {withCredentials: true},
              );
              resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
            }
          }
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      }

      if (
        !(resolvedMatrixData.cycles || []).length &&
        URLS.API_BASE_URL.includes('127.0.0.1')
      ) {
        try {
          const memberLookup = await axios.get<MemberLookupResponse>(
            URLS.buildMemberByCodeUrl(LOCAL_MATRIX_FALLBACK_MEMBER_CODE),
            {withCredentials: true},
          );
          const fallbackMemberId =
            memberLookup.data.memberId || memberLookup.data.userId;

          if (fallbackMemberId) {
            const memberMatrix = await axios.get<MatrixMemberResponse>(
              URLS.buildMatrixByMemberIdUrl(fallbackMemberId),
              {withCredentials: true},
            );
            resolvedMatrixData = {cycles: memberMatrix.data.cycles || []};
          }
        } catch (fallbackError) {
          console.error(fallbackError);
        }
      }

      if (
        !(resolvedMatrixData.cycles || []).length &&
        URLS.API_BASE_URL.includes('127.0.0.1')
      ) {
        resolvedMatrixData = LOCAL_MATRIX_DEV_FALLBACK_DATA;
      }

      setMatrixData(resolvedMatrixData);

      const matrixSettings =
        matrixSettingsResult.status === 'fulfilled'
          ? matrixSettingsResult.value.data
          : undefined;

      const startOfToday = toStartOfToday();
      const cwToday = commissions.reduce((sum, entry) => {
        if (entry.status?.toLowerCase() === 'fallback' || !entry.createdAt) {
          return sum;
        }

        const createdAt = new Date(entry.createdAt).getTime();

        if (Number.isNaN(createdAt) || createdAt < startOfToday) {
          return sum;
        }

        return sum + parseDecimal(entry.amount);
      }, 0);

      const swBalance = parseDecimal(wallet?.shoppingBalance);
      const reentryTarget = resolveReentryTarget(resolvedMatrixData, matrixSettings);

      setMetrics({
        cwToday: formatDecimal(cwToday),
        cwTotal: formatDecimal(parseDecimal(wallet?.approvedBalance)),
        sw: formatDecimal(swBalance),
        swReentryTarget: formatDecimal(reentryTarget),
        withdraw: formatDecimal(parseDecimal(wallet?.withdrawableBalance)),
        dcw: formatDecimal(parseDecimal(wallet?.discountBalance)),
      });

    } catch (error) {
      console.error(error);
      setMetrics(defaultMetrics);
      setMatrixData({cycles: []});
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
    ? 'calc((100% - 8px) / 2)'
    : isTabletViewport
      ? '168px'
      : '196px';

  const tiles = dashboardTiles(metrics);

  const handleTileClick = (tileKey: string) => {
    if (tileKey === 'sw') {
      navigate('/TopupWallet');
      return;
    }

    if (tileKey === 'sw-transfer') {
      navigate('/TransferSW');
      return;
    }

    if (tileKey === 'withdraw') {
      navigate('/WithdrawSW');
    }
  };

  const getBoardLevelCapacity = (cycle: MatrixCycleSummary, levelNo: number) => {
    return Math.max(1, Math.pow(cycle.boardWidth || 2, levelNo));
  };

  const getBoardLevelRows = (cycle: MatrixCycleSummary, board: MatrixBoardSummary) => {
    const maxVisibleDepth = Math.max(3, cycle.boardDepth || 3);

    return Array.from({length: maxVisibleDepth}, (_, index) => {
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

    if (board.status?.toLowerCase() === 'active') {
      return 'Active';
    }

    return 'Wait';
  };

  const renderMatrixBoardCard = (
    cycle: MatrixCycleSummary,
    board: MatrixBoardSummary,
  ): JSX.Element => {
    const levelRows = getBoardLevelRows(cycle, board);
    const statusLabel = getBoardStatusLabel(board);
    const isComplete = statusLabel === 'Complete';
    const isActive = statusLabel === 'Active';
    const boardTitle = `Board ${board.boardNo || 1}`;

    return (
      <button
        key={`${cycle.cycleId}-${board.boardId}`}
        onClick={() => setSelectedMatrixBoard({cycleNo: cycle.cycleNo || 1, board})}
        style={{
          border: 'none',
          textAlign: 'left',
          borderRadius: 16,
          padding: 11,
          cursor: 'pointer',
          background:
            'linear-gradient(180deg, rgba(96,126,218,0.96) 0%, rgba(96,126,218,0.90) 100%)',
          boxShadow: '0 12px 24px rgba(47, 74, 156, 0.22)',
          color: '#FFFFFF',
          display: 'grid',
          gap: 8,
          width: matrixBoardWidth,
          minWidth: matrixBoardWidth,
          flex: '0 0 auto',
          overflow: 'hidden',
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
                gap: 5,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: '50%',
                  backgroundColor: '#8CF369',
                  boxShadow: '0 0 0 2px rgba(255,255,255,0.12)',
                }}
              />
              <strong
                style={{
                  fontSize: 10,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                S Size
              </strong>
            </div>
            <div
              style={{
                fontSize: 9,
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
                fontSize: 11,
                ...theme.fonts.Mulish_700Bold,
                marginBottom: 6,
              }}
            >
              {boardTitle}
            </div>
            <div
              style={{
                fontSize: 9,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              Inv {cycle.cycleNo}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 10,
            maxHeight: 172,
            overflowY: 'auto',
            paddingRight: 2,
          }}
        >
          {levelRows.map(level => (
            <div key={`${board.boardId}-level-${level.levelNo}`}>
              <div
                style={{
                  marginBottom: 6,
                  fontSize: 10,
                  ...theme.fonts.Mulish_600SemiBold,
                }}
              >
                Level {level.levelNo} ({level.filled}/{level.capacity})
              </div>
              <div
                style={{
                  width: '100%',
                  height: 14,
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
            padding: '8px 10px',
            textAlign: 'center',
            backgroundColor: isComplete
              ? 'rgba(58, 85, 150, 0.95)'
              : isActive
                ? 'rgba(25, 73, 151, 0.95)'
                : 'rgba(58, 85, 150, 0.95)',
            fontSize: 11,
            ...theme.fonts.Mulish_700Bold,
          }}
        >
          {statusLabel}
        </div>
      </button>
    );
  };

  const renderMatrixBoards = (): JSX.Element => {
    const cycles =
      (matrixData.cycles || []).length > 0
        ? matrixData.cycles || []
        : URLS.API_BASE_URL.includes('127.0.0.1')
          ? LOCAL_MATRIX_DEV_FALLBACK_DATA.cycles || []
          : [];

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
          const orderedBoards = [...(cycle.boards || [])].sort((left, right) => {
            const leftRound = left.roundNo || 0;
            const rightRound = right.roundNo || 0;

            if (leftRound !== rightRound) {
              return leftRound - rightRound;
            }

            return (left.boardNo || 0) - (right.boardNo || 0);
          });

          return (
            <section
              key={cycle.cycleId}
              style={{
                borderRadius: 28,
                padding: 18,
                background: 'linear-gradient(180deg, #5B9DE0 0%, #4D8FD6 100%)',
                border: '4px solid #35699E',
                boxShadow: '0 20px 40px rgba(53, 105, 158, 0.18)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 14,
                  color: '#FFFFFF',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: isMobileViewport ? 18 : 24,
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    รอบ {cycle.cycleNo}
                  </div>
                  <div
                    style={{
                      fontSize: isMobileViewport ? 14 : 15,
                      opacity: 0.92,
                      ...theme.fonts.Mulish_400Regular,
                    }}
                  >
                    กระดาน {orderedBoards.length} / ปัจจุบัน Board {cycle.currentBoardNo}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  scrollBehavior: 'smooth',
                  overscrollBehaviorX: 'contain',
                  WebkitOverflowScrolling: 'touch',
                  gap: 8,
                  alignItems: 'stretch',
                  paddingBottom: 4,
                }}
              >
                {orderedBoards.map(board => renderMatrixBoardCard(cycle, board))}
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

    const cycles =
      (matrixData.cycles || []).length > 0
        ? matrixData.cycles || []
        : URLS.API_BASE_URL.includes('127.0.0.1')
          ? LOCAL_MATRIX_DEV_FALLBACK_DATA.cycles || []
          : [];

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
              onClick={() => navigate('/TopupWallet')}
              style={{
                marginBottom: 16,
                padding: '16px 18px',
                borderRadius: 18,
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                border: '1px solid #BFDBFE',
                boxShadow: '0 16px 32px rgba(59, 130, 246, 0.10)',
                cursor: 'pointer',
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
                <div
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
                    ...theme.fonts.Mulish_700Bold,
                  }}
                >
                  SW
                </div>
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
                    Reentry
                  </span>
                  <button
                    onClick={event => {
                      event.stopPropagation();
                      setSwReentryEnabled(current => !current);
                    }}
                    style={{
                      border: 'none',
                      borderRadius: 999,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      backgroundColor: swReentryEnabled ? '#16A34A' : '#DC2626',
                      color: '#FFFFFF',
                      minWidth: 62,
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    {swReentryEnabled ? 'ON' : 'OFF'}
                  </button>
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
                      tile.key === 'sw' ||
                      tile.key === 'sw-transfer' ||
                      tile.key === 'withdraw'
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
                  </div>
                </article>
              ))}
            </section>
          </>
        ) : null}

        {selectedCard?.key === 'matrix' ? renderMatrixBoards() : null}

        {selectedCard && selectedCard.key !== 'matrix' ? (
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
        ) : null}

        {renderMatrixBoardModal()}
      </main>
    </>
  );
};
