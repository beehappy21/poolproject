import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {URLS} from '../config';
import {theme} from '../constants';
import {components} from '../components';
import {hooks} from '../hooks';
import {RootState} from '../store';

type TreeNode = {
  memberId: string;
  memberCode: string;
  referralCode: string;
  name: string;
  sponsorId: string | null;
  placementSide?: 'LEFT' | 'MIDDLE' | 'RIGHT' | null;
  childCount: number;
};

type TreePayload = {
  member: {
    memberId: string;
    memberCode: string;
    referralCode: string;
    name: string;
    sponsorId: string | null;
  };
  directReferrals: TreeNode[];
  legTotals: {
    DIRECT: number;
    LEFT: number;
    MIDDLE: number;
    RIGHT: number;
  };
};

export const TeamMember: React.FC = () => {
  const navigate = useNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const initialMemberCode = user?.memberCode?.trim().toUpperCase() || '';
  const [selectedFilter, setSelectedFilter] = useState<
    'DIRECT' | 'LEFT' | 'MIDDLE' | 'RIGHT'
  >('DIRECT');
  const [viewMode, setViewMode] = useState<'TREE' | 'CHART'>('TREE');
  const [rootCodeInput, setRootCodeInput] = useState(
    initialMemberCode,
  );
  const [activeRootCode, setActiveRootCode] = useState(
    initialMemberCode,
  );
  const [rootMemberName, setRootMemberName] = useState('');
  const [childrenByCode, setChildrenByCode] = useState<Record<string, TreeNode[]>>(
    {},
  );
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [loadingCodes, setLoadingCodes] = useState<Record<string, boolean>>({});
  const [screenLoading, setScreenLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rootLegTotals, setRootLegTotals] = useState<{
    DIRECT: number;
    LEFT: number;
    MIDDLE: number;
    RIGHT: number;
  }>({
    DIRECT: 0,
    LEFT: 0,
    MIDDLE: 0,
    RIGHT: 0,
  });
  const [chartLoading, setChartLoading] = useState(false);
  const [memberNavHistory, setMemberNavHistory] = useState<string[]>([]);

  const fetchTreeLevel = async (memberCode: string): Promise<TreePayload> => {
    const headers = user?.accessToken
      ? {Authorization: `Bearer ${user.accessToken}`}
      : undefined;
    const response = await axios.get<TreePayload>(
      URLS.buildMemberDirectReferralsUrl(memberCode),
      {headers},
    );

    return response.data;
  };

  const loadRootLevel = async (memberCode: string) => {
    setScreenLoading(true);
    setErrorMessage('');

    try {
      const payload = await fetchTreeLevel(memberCode);
      setActiveRootCode(payload.member.memberCode);
      setRootCodeInput(payload.member.memberCode);
      setRootMemberName(payload.member.name);
      setChildrenByCode({[payload.member.memberCode]: payload.directReferrals});
      setRootLegTotals(payload.legTotals);
      setExpandedCodes({});
      setSelectedFilter('DIRECT');
    } catch (error: any) {
      setChildrenByCode({});
      setRootLegTotals({DIRECT: 0, LEFT: 0, MIDDLE: 0, RIGHT: 0});
      setRootMemberName('');
      setErrorMessage(
        error?.response?.data?.message ||
          'ไม่สามารถโหลดข้อมูลทีมงานได้ในขณะนี้',
      );
    } finally {
      setScreenLoading(false);
    }
  };

  const openMember = (memberCode: string, pushHistory: boolean) => {
    if (!memberCode || memberCode === activeRootCode) {
      return;
    }
    if (pushHistory && activeRootCode) {
      setMemberNavHistory(current => [...current, activeRootCode]);
    }
    loadRootLevel(memberCode);
  };

  useEffect(() => {
    if (!initialMemberCode) {
      setScreenLoading(false);
      setErrorMessage('ไม่พบรหัสสมาชิกของ session ปัจจุบัน กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      return;
    }

    loadRootLevel(initialMemberCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMemberCode]);

  const handleExpand = async (node: TreeNode) => {
    if (loadingCodes[node.memberCode]) {
      return;
    }

    const isExpanded = Boolean(expandedCodes[node.memberCode]);
    if (isExpanded) {
      setExpandedCodes(current => ({...current, [node.memberCode]: false}));
      return;
    }

    if (childrenByCode[node.memberCode]) {
      setExpandedCodes(current => ({...current, [node.memberCode]: true}));
      return;
    }

    setLoadingCodes(current => ({...current, [node.memberCode]: true}));
    try {
      const payload = await fetchTreeLevel(node.memberCode);
      setChildrenByCode(current => ({
        ...current,
        [node.memberCode]: payload.directReferrals,
      }));
      setExpandedCodes(current => ({...current, [node.memberCode]: true}));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCodes(current => ({...current, [node.memberCode]: false}));
    }
  };

  const rootChildren = childrenByCode[activeRootCode] || [];
  const filteredRootChildren =
    selectedFilter === 'DIRECT'
      ? rootChildren
      : rootChildren.filter(node => node.placementSide === selectedFilter);

  const directCount = rootLegTotals.DIRECT;
  const leftCount = rootLegTotals.LEFT;
  const middleCount = rootLegTotals.MIDDLE;
  const rightCount = rootLegTotals.RIGHT;
  const sideOrder: Array<'LEFT' | 'MIDDLE' | 'RIGHT'> = ['LEFT', 'MIDDLE', 'RIGHT'];

  const findNodeBySide = (
    nodes: TreeNode[],
    side: 'LEFT' | 'MIDDLE' | 'RIGHT',
  ): TreeNode | null => {
    return nodes.find(node => node.placementSide === side) || null;
  };

  useEffect(() => {
    if (viewMode !== 'CHART' || screenLoading || errorMessage) {
      return;
    }

    const parentCodes = rootChildren.map(node => node.memberCode);
    const missing = parentCodes.filter(code => !childrenByCode[code]);
    if (missing.length === 0) {
      return;
    }

    let cancelled = false;
    setChartLoading(true);

    Promise.all(
      missing.map(async code => {
        const payload = await fetchTreeLevel(code);
        return {code, children: payload.directReferrals};
      }),
    )
      .then(results => {
        if (cancelled) {
          return;
        }
        setChildrenByCode(current => {
          const next = {...current};
          for (const row of results) {
            next[row.code] = row.children;
          }
          return next;
        });
      })
      .catch(error => {
        console.error(error);
      })
      .finally(() => {
        if (!cancelled) {
          setChartLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, screenLoading, errorMessage, activeRootCode, rootChildren.length]);

  const renderChartCard = (
    node: TreeNode | null,
    size: 'root' | 'child' | 'grandchild',
    slotLabel: string,
    emptySponsorCode?: string,
  ): JSX.Element => {
    const isRoot = size === 'root';
    const isEmpty = !node;
    const canOpenMember = Boolean(node?.memberCode);

    return (
      <div
        key={slotLabel + (node?.memberCode || 'empty')}
        onClick={() => {
          if (!node?.memberCode) {
            return;
          }
          openMember(node.memberCode, true);
        }}
        style={{
          border: '1px solid #D4DDEB',
          borderRadius: 12,
          backgroundColor: isEmpty ? '#F8FAFC' : '#FFFFFF',
          minHeight: isRoot ? 92 : 82,
          padding: isRoot ? '14px 12px' : '12px 10px',
          display: 'grid',
          gap: 6,
          alignContent: 'center',
          textAlign: 'center',
          cursor: canOpenMember ? 'pointer' : 'default',
        }}
      >
        <div
          style={{
            color: '#64748B',
            fontSize: 12,
            letterSpacing: '0.06em',
            ...theme.fonts.Mulish_700Bold,
          }}
        >
          {slotLabel}
        </div>
        {isEmpty ? (
          <>
            <div
              style={{
                color: '#94A3B8',
                fontSize: 13,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              ไม่มีสมาชิก
            </div>
            {emptySponsorCode ? (
              <button
                type='button'
                onClick={event => {
                  event.stopPropagation();
                  navigate(`/SignUp?ref=${encodeURIComponent(emptySponsorCode)}`);
                }}
                style={{
                  marginTop: 2,
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: theme.colors.mainColor,
                  borderRadius: 8,
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer',
                  ...theme.fonts.Mulish_600SemiBold,
                }}
              >
                สมัครสมาชิกใหม่
              </button>
            ) : null}
          </>
        ) : (
          <>
            <div
              style={{
                color: theme.colors.mainColor,
                fontSize: isRoot ? 20 : 16,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {node.memberCode}
            </div>
            <div
              style={{
                color: theme.colors.textColor,
                fontSize: 13,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              {node.name}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderNode = (node: TreeNode, level: number): JSX.Element => {
    const children = childrenByCode[node.memberCode];
    const isExpanded = Boolean(expandedCodes[node.memberCode]);
    const isLoading = Boolean(loadingCodes[node.memberCode]);
    const sideLabel =
      node.placementSide === 'LEFT'
        ? 'L'
        : node.placementSide === 'MIDDLE'
          ? 'M'
          : node.placementSide === 'RIGHT'
            ? 'R'
            : '-';

    return (
      <li key={node.memberCode} style={{listStyle: 'none', color: theme.colors.mainColor}}>
        <button
          onClick={() => handleExpand(node)}
          style={{
            width: '100%',
            border: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            borderRadius: 14,
            padding: '12px 14px',
            cursor: 'pointer',
            color: theme.colors.mainColor,
            fontSize: level === 0 ? 17 : 15,
            lineHeight: 1.5,
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            ...theme.fonts.Mulish_600SemiBold,
          }}
        >
          <span style={{minWidth: 0}}>
            {'\uD83D\uDCC1'} {node.memberCode} {node.name}
            <span
              style={{
                display: 'block',
                marginTop: 4,
                color: theme.colors.textColor,
                fontSize: 12,
                ...theme.fonts.Mulish_400Regular,
              }}
            >
              ตำแหน่ง {sideLabel} · ทีมย่อย {node.childCount}
            </span>
          </span>
          <span
            style={{
              color: '#94A3B8',
              fontSize: 20,
              lineHeight: 1,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            {isExpanded ? '−' : '›'}
          </span>
        </button>

        {isLoading ? (
          <div
            style={{
              marginTop: 6,
              marginLeft: 28,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            กำลังโหลดข้อมูล...
          </div>
        ) : null}

        {isExpanded && children?.length ? (
          <ul
            style={{
              marginTop: 6,
              marginBottom: 6,
              paddingLeft: level === 0 ? 16 : 14,
              display: 'grid',
              gap: 8,
            }}
          >
            {children.map(child => renderNode(child, level + 1))}
          </ul>
        ) : null}

        {isExpanded && children && children.length === 0 ? (
          <div
            style={{
              marginTop: 6,
              marginLeft: 28,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            ไม่มีสายงานต่อ
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <components.Header title='ทีมงาน / Team member' goBack={true} />
      <main
        style={{
          padding: '20px 20px 120px',
          backgroundColor: '#F4F6FA',
          minHeight: 'calc(100vh - 72px)',
        }}
      >
        <section style={{marginBottom: 16}}>
          <h2
            style={{
              margin: '0 0 4px',
              color: theme.colors.mainColor,
              fontSize: 30,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            Member
          </h2>
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              fontSize: 18,
              ...theme.fonts.Mulish_600SemiBold,
            }}
          >
            {viewMode === 'TREE' ? 'Tree' : 'ผังแนะนำ'}
          </p>
        </section>

        <section style={{display: 'flex', gap: 8, marginBottom: 14}}>
          {[
            {key: 'TREE' as const, label: 'Tree'},
            {key: 'CHART' as const, label: 'ผังแนะนำ'},
          ].map(item => {
            const isActive = viewMode === item.key;
            return (
              <button
                key={item.key}
                type='button'
                onClick={() => setViewMode(item.key)}
                style={{
                  border: `1px solid ${isActive ? theme.colors.mainColor : '#CBD5E1'}`,
                  backgroundColor: isActive ? theme.colors.mainColor : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : theme.colors.mainColor,
                  borderRadius: 10,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </section>

        <section
          style={{
            marginBottom: 16,
            padding: 18,
            borderRadius: 0,
            background: 'linear-gradient(180deg, #232734 0%, #171B26 100%)',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.18)',
          }}
        >
          <div
            style={{
              marginBottom: 16,
              color: '#FFFFFF',
              fontSize: 28,
              ...theme.fonts.Mulish_700Bold,
            }}
          >
            Team volume
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {[
              {key: 'DIRECT' as const, label: 'DIRECT', count: directCount},
              {key: 'LEFT' as const, label: 'L', count: leftCount},
              {key: 'MIDDLE' as const, label: 'M', count: middleCount},
              {key: 'RIGHT' as const, label: 'R', count: rightCount},
            ].map(item => {
              const isActive = selectedFilter === item.key;

              return (
                <button
                  key={item.key}
                  type='button'
                  onClick={() => setSelectedFilter(item.key)}
                  style={{
                    border: '1px solid rgba(167, 139, 250, 0.36)',
                    borderRadius: 0,
                    padding: '16px 10px',
                    background: isActive
                      ? 'linear-gradient(180deg, rgba(76, 90, 138, 0.96) 0%, rgba(72, 48, 102, 0.96) 100%)'
                      : 'linear-gradient(180deg, rgba(66, 79, 120, 0.92) 0%, rgba(63, 46, 96, 0.92) 100%)',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: 8,
                    justifyItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: item.key === 'DIRECT' ? 14 : 18,
                      letterSpacing: '0.08em',
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 28,
                      lineHeight: 1,
                      ...theme.fonts.Mulish_700Bold,
                    }}
                  >
                    {item.count}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            backgroundColor: theme.colors.white,
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${theme.colors.aliceBlue2}`,
          }}
        >
          <div style={{display: 'flex', gap: 10, marginBottom: 18}}>
            <input
              value={rootCodeInput}
              onChange={event => setRootCodeInput(event.target.value.toUpperCase())}
              style={{
                flex: 1,
                height: 42,
                border: '2px solid #30384A',
                padding: '0 12px',
                color: theme.colors.mainColor,
                fontSize: 16,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            />
            <button
              onClick={() => {
                const nextCode = rootCodeInput.trim().toUpperCase();
                if (!nextCode) {
                  return;
                }
                setMemberNavHistory([]);
                loadRootLevel(nextCode);
              }}
              style={{
                border: 'none',
                backgroundColor: theme.colors.mainColor,
                color: theme.colors.mainYellow,
                borderRadius: 12,
                padding: '0 16px',
                cursor: 'pointer',
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              โหลด
            </button>
          </div>

          <div
            style={{
              borderTop: `1px solid ${theme.colors.aliceBlue2}`,
              paddingTop: 18,
            }}
          >
            {screenLoading ? (
              <components.Loader />
            ) : errorMessage ? (
              <div
                style={{
                  color: theme.colors.coralRed,
                  lineHeight: 1.7,
                  ...theme.fonts.Mulish_400Regular,
                }}
              >
                {errorMessage}
              </div>
            ) : (
              <>
                <div
                  style={{
                    marginBottom: 12,
                    color: theme.colors.textColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    ...theme.fonts.Mulish_400Regular,
                  }}
                >
                  <span>
                    {activeRootCode}
                    {rootMemberName ? ` ${rootMemberName}` : ''}
                  </span>
                  {memberNavHistory.length > 0 ? (
                    <button
                      type='button'
                      onClick={() => {
                        const lastCode =
                          memberNavHistory[memberNavHistory.length - 1];
                        if (!lastCode) {
                          return;
                        }
                        setMemberNavHistory(current => current.slice(0, -1));
                        loadRootLevel(lastCode);
                      }}
                      style={{
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: theme.colors.mainColor,
                        borderRadius: 8,
                        padding: '4px 10px',
                        fontSize: 12,
                        cursor: 'pointer',
                        ...theme.fonts.Mulish_700Bold,
                      }}
                    >
                      ย้อนกลับ
                    </button>
                  ) : null}
                </div>
                {viewMode === 'TREE' ? (
                  filteredRootChildren.length === 0 ? (
                    <div
                      style={{
                        color: theme.colors.textColor,
                        lineHeight: 1.7,
                        ...theme.fonts.Mulish_400Regular,
                      }}
                    >
                      ยังไม่มีสมาชิกในกลุ่ม{' '}
                      {selectedFilter === 'DIRECT'
                        ? 'direct'
                        : selectedFilter === 'LEFT'
                          ? 'L'
                          : selectedFilter === 'MIDDLE'
                            ? 'M'
                            : 'R'}
                    </div>
                  ) : (
                    <ul style={{margin: 0, paddingLeft: 0, display: 'grid', gap: 10}}>
                      {filteredRootChildren.map(node => renderNode(node, 0))}
                    </ul>
                  )
                ) : (
                  <div style={{display: 'grid', gap: 12}}>
                    <div
                      style={{
                        color: theme.colors.textColor,
                        fontSize: 13,
                        ...theme.fonts.Mulish_600SemiBold,
                      }}
                    >
                      ผังแนะนำ 3 ชั้น (1-3-9)
                    </div>
                    {chartLoading ? (
                      <div
                        style={{
                          color: theme.colors.textColor,
                          ...theme.fonts.Mulish_400Regular,
                        }}
                      >
                        กำลังโหลดผังแนะนำ...
                      </div>
                    ) : null}
                    {renderChartCard(
                      {
                        memberId: activeRootCode,
                        memberCode: activeRootCode,
                        referralCode: activeRootCode,
                        name: rootMemberName,
                        sponsorId: null,
                        childCount: rootChildren.length,
                      },
                      'root',
                      'ชั้นที่ 1',
                    )}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 8,
                      }}
                    >
                      {sideOrder.map(side =>
                        renderChartCard(
                          findNodeBySide(rootChildren, side),
                          'child',
                          `ชั้นที่ 2 - ${side === 'LEFT' ? 'L' : side === 'MIDDLE' ? 'M' : 'R'}`,
                          activeRootCode,
                        ),
                      )}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 8,
                      }}
                    >
                      {sideOrder.map(parentSide => {
                        const parentNode = findNodeBySide(rootChildren, parentSide);
                        const grandchildren = parentNode
                          ? childrenByCode[parentNode.memberCode] || []
                          : [];
                        const parentLabel =
                          parentSide === 'LEFT'
                            ? 'L'
                            : parentSide === 'MIDDLE'
                              ? 'M'
                              : 'R';
                        return (
                          <div
                            key={`branch-${parentSide}`}
                            style={{
                              border: '1px solid #D9E2EF',
                              borderRadius: 12,
                              backgroundColor: '#F8FAFC',
                              padding: 8,
                              display: 'grid',
                              gap: 8,
                            }}
                          >
                            {sideOrder.map(childSide =>
                              renderChartCard(
                                findNodeBySide(grandchildren, childSide),
                                'grandchild',
                                `${parentLabel}-${childSide === 'LEFT' ? 'L' : childSide === 'MIDDLE' ? 'M' : 'R'}`,
                                parentNode?.memberCode || undefined,
                              ),
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
};
