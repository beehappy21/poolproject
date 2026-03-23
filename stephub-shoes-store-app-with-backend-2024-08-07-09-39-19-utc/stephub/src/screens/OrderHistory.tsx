import axios from 'axios';

import {useEffect, useState, FC, useCallback} from 'react';
import * as Accordion from '@radix-ui/react-accordion';

import {URLS} from '../config';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {components} from '../components';
import {hooks, RootState} from '../hooks';

type LiveOrder = {
  orderId: string;
  orderNo: string;
  status: string;
  approvalStatus: string;
  totalUsdt: string;
  totalPv: string;
  cashDueUsdt: string;
  cashPaymentMethod: string | null;
  transferSubmittedAt: string | null;
  transferSlipUrl: string | null;
  transferSlipNote: string | null;
  approvedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  shipmentTrackingNo: string | null;
  shipmentCarrier: string | null;
  shipmentNote: string | null;
  createdAt: string;
};

type PaymentInstructions = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  promptPayName: string;
  promptPayNumber: string;
  qrImageUrl: string;
  note: string;
};

const MAX_TRANSFER_SLIP_DIMENSION = 1600;
const TRANSFER_SLIP_OUTPUT_QUALITY = 0.82;

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

const resizeTransferSlipImage = async (file: File): Promise<string> => {
  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(sourceDataUrl);
  const scale = Math.min(
    1,
    MAX_TRANSFER_SLIP_DIMENSION / Math.max(image.width, image.height),
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

  return canvas.toDataURL('image/jpeg', TRANSFER_SLIP_OUTPUT_QUALITY);
};

export const OrderHistory: FC = () => {
  const navigate = hooks.useAppNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const [loading, setLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<LiveOrder[]>([]);
  const [paymentInstructions, setPaymentInstructions] =
    useState<PaymentInstructions | null>(null);
  const [pageErrorMessage, setPageErrorMessage] = useState('');
  const [submitErrorMessage, setSubmitErrorMessage] = useState('');
  const [submittingOrderId, setSubmittingOrderId] = useState<string | null>(null);
  const [transferSlipUrls, setTransferSlipUrls] = useState<Record<string, string>>(
    {},
  );
  const [transferSlipFileNames, setTransferSlipFileNames] = useState<
    Record<string, string>
  >({});
  const [transferSlipNotes, setTransferSlipNotes] = useState<Record<string, string>>(
    {},
  );

  const getOrderState = (order: LiveOrder): string => {
    if (order.deliveredAt) return 'Delivered';
    if (order.shippedAt) return 'Shipped';
    if (order.approvalStatus === 'approved') return 'Awaiting Shipment';
    if (order.transferSubmittedAt) return 'Transfer Review';
    return 'Awaiting Payment';
  };

  const getOrderStateColor = (order: LiveOrder): string => {
    if (order.deliveredAt) return '#51BA74';
    if (order.shippedAt) return '#F5C102';
    if (order.approvalStatus === 'approved') return theme.colors.mainColor;
    if (order.transferSubmittedAt) return '#F97316';
    return '#FF4343';
  };

  const formatOrderDate = (value: string): string => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const getTimelineLabel = (order: LiveOrder): string => {
    if (order.deliveredAt) {
      return 'Created -> Slip Submitted -> Approved -> Shipped -> Delivered';
    }

    if (order.shippedAt) {
      return 'Created -> Slip Submitted -> Approved -> Shipped';
    }

    if (order.approvalStatus === 'approved') {
      return 'Created -> Slip Submitted -> Approved -> Awaiting Shipment';
    }

    if (order.transferSubmittedAt) {
      return 'Created -> Slip Submitted -> Transfer Review';
    }

    return 'Created -> Awaiting Payment';
  };

  const getApprovalStatusLabel = (approvalStatus: string): string => {
    if (approvalStatus === 'approved') {
      return 'Approved';
    }

    return 'Pending Review';
  };

  const canSubmitTransferSlip = (order: LiveOrder): boolean => {
    return !order.transferSubmittedAt && order.approvalStatus !== 'approved';
  };

  const shouldShowPaymentInstructions = (order: LiveOrder): boolean => {
    return order.approvalStatus !== 'approved';
  };

  const getOrders = useCallback(async (): Promise<void> => {
    if (!user?.accessToken) {
      setOrdersData([]);
      setPageErrorMessage('Sign in first to view your order history.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get<{items?: LiveOrder[]} | LiveOrder[]>(
        URLS.AUTH_ORDERS,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
          withCredentials: true,
        },
      );
      const payload = response.data;
      setOrdersData(Array.isArray(payload) ? payload : payload.items || []);
      setPageErrorMessage('');
    } catch (error) {
      console.error(error);
      setOrdersData([]);
      setPageErrorMessage('Unable to load your order history right now.');
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken]);

  const getPaymentInstructions = useCallback(async (): Promise<void> => {
    if (!user?.accessToken) {
      setPaymentInstructions(null);
      return;
    }

    try {
      const response = await axios.get<PaymentInstructions>(
        URLS.AUTH_PAYMENT_INSTRUCTIONS,
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
          withCredentials: true,
        },
      );
      setPaymentInstructions(response.data);
    } catch (error) {
      console.error(error);
      setPaymentInstructions(null);
    }
  }, [user?.accessToken]);

  const handleTransferSlipSubmit = async (order: LiveOrder): Promise<void> => {
    if (!user?.accessToken) {
      setSubmitErrorMessage('Sign in first to submit a transfer slip.');
      return;
    }

    const transferSlipUrl = transferSlipUrls[order.orderId]?.trim();
    const transferSlipNote = transferSlipNotes[order.orderId]?.trim();

    if (!transferSlipUrl) {
      setSubmitErrorMessage(
        'Please select your transfer slip image before submitting.',
      );
      return;
    }

    setSubmittingOrderId(order.orderId);
    setSubmitErrorMessage('');

    try {
      await axios.post(
        URLS.buildSubmitTransferSlipUrl(order.orderId),
        {
          transferSlipUrl,
          transferSlipNote: transferSlipNote || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
          withCredentials: true,
        },
      );

      setTransferSlipUrls(current => ({...current, [order.orderId]: ''}));
      setTransferSlipFileNames(current => ({...current, [order.orderId]: ''}));
      setTransferSlipNotes(current => ({...current, [order.orderId]: ''}));
      await getOrders();
    } catch (error: any) {
      if (error?.response?.status === 413) {
        setSubmitErrorMessage(
          'Transfer slip image is too large. Please choose a smaller image.',
        );
      } else {
        setSubmitErrorMessage(
          error?.response?.data?.message ||
            'Unable to submit your transfer slip right now.',
        );
      }
    } finally {
      setSubmittingOrderId(null);
    }
  };

  useEffect(() => {
    getOrders();
    getPaymentInstructions();
  }, [getOrders, getPaymentInstructions]);

  const renderHeader = () => {
    return <components.Header goBack={true} title='Order History' />;
  };

  const renderContent = (): JSX.Element => {
    if (loading) return <components.Loader />;

    if (pageErrorMessage) {
      return (
        <div style={{padding: '40px 20px 20px 20px'}}>
          <p
            style={{
              margin: '0 0 20px 0',
              color: theme.colors.textColor,
              lineHeight: 1.7,
            }}
          >
            {pageErrorMessage}
          </p>
          <components.Button
            title={user?.accessToken ? 'Back to Home' : 'Back to Sign In'}
            onClick={() => navigate(user?.accessToken ? '/TabNavigator' : '/')}
          />
        </div>
      );
    }

    if (ordersData.length === 0) {
      return (
        <div style={{padding: '40px 20px 20px 20px'}}>
          <p
            style={{
              margin: 0,
              color: theme.colors.textColor,
              lineHeight: 1.7,
              marginBottom: 20,
            }}
          >
            You do not have any orders yet.
          </p>
          <components.Button
            title='Browse Packages'
            onClick={() => navigate('/Shop')}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          padding: '10px 0 20px 0',
        }}
      >
        <Accordion.Root type='single' collapsible={true}>
          {ordersData.map((order, index) => {
            return (
              <Accordion.Item key={index} value={order.orderId}>
                <Accordion.Trigger
                  style={{
                    flexDirection: 'column',
                    width: '100%',
                    display: 'flex',
                    padding: '10px 20px 18px 20px',
                    borderBottom: '4px solid #E8EFF4',
                  }}
                >
                  <div
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 7,
                    }}
                  >
                    <h5
                      style={{
                        margin: 0,
                        ...theme.fonts.Mulish_600SemiBold,
                        fontSize: 16,
                        color: theme.colors.mainColor,
                        lineHeight: 1.2,
                      }}
                    >
                      #{order.orderNo}
                    </h5>
                    <span
                      style={{
                        ...theme.fonts.Mulish_400Regular,
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: getOrderStateColor(order),
                      }}
                    >
                      {getOrderState(order)}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        ...theme.fonts.Mulish_400Regular,
                        fontSize: 12,
                        color: theme.colors.textColor,
                        lineHeight: 1.5,
                      }}
                    >
                      {formatOrderDate(order.createdAt)}
                    </span>
                    <span
                      style={{
                        ...theme.fonts.Mulish_700Bold,
                        fontSize: 12,
                        color: theme.colors.mainColor,
                        lineHeight: 1.5,
                      }}
                    >
                      ${Number(order.totalUsdt || 0).toFixed(2)}
                    </span>
                  </div>
                </Accordion.Trigger>
                <Accordion.Content
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderBottom: '4px solid #E8EFF4',
                    padding: '10px 20px 18px 20px',
                  }}
                >
                  <div
                    style={{
                      marginBottom: 22,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        ...theme.fonts.Mulish_400Regular,
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: theme.colors.textColor,
                      }}
                    >
                      Approval: {getApprovalStatusLabel(order.approvalStatus)}
                    </span>
                    <span
                      style={{
                        ...theme.fonts.Mulish_400Regular,
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: theme.colors.textColor,
                      }}
                    >
                      PV: {order.totalPv}
                    </span>
                    {order.transferSubmittedAt ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Slip Submitted: {formatOrderDate(order.transferSubmittedAt)}
                      </span>
                    ) : null}
                    {order.approvedAt ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Approved At: {formatOrderDate(order.approvedAt)}
                      </span>
                    ) : null}
                    {order.deliveredAt ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Delivered At: {formatOrderDate(order.deliveredAt)}
                      </span>
                    ) : null}
                    {order.shipmentTrackingNo ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Tracking: {order.shipmentTrackingNo}
                      </span>
                    ) : null}
                    {order.shipmentCarrier ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Carrier: {order.shipmentCarrier}
                      </span>
                    ) : null}
                    {order.shipmentNote ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Note: {order.shipmentNote}
                      </span>
                    ) : null}
                    <span
                      style={{
                        ...theme.fonts.Mulish_400Regular,
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: theme.colors.textColor,
                      }}
                    >
                      Timeline: {getTimelineLabel(order)}
                    </span>
                    {order.transferSlipUrl ? (
                      <a
                        href={order.transferSlipUrl}
                        rel='noreferrer'
                        target='_blank'
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.mainColor,
                          textDecoration: 'underline',
                        }}
                      >
                        Open transfer slip
                      </a>
                    ) : null}
                  </div>
                  {shouldShowPaymentInstructions(order) && paymentInstructions ? (
                    <div
                      style={{
                        marginBottom: 22,
                        padding: 16,
                        borderRadius: 16,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E8EFF4',
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          ...theme.fonts.Mulish_700Bold,
                          fontSize: 15,
                          lineHeight: 1.5,
                          color: theme.colors.mainColor,
                        }}
                      >
                        Payment Instructions
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_700Bold,
                          fontSize: 18,
                          lineHeight: 1.5,
                          color: '#FF4343',
                        }}
                      >
                        Amount Due: $
                        {Number(
                          order.cashDueUsdt || order.totalUsdt || 0,
                        ).toFixed(2)}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Payment Method: {order.cashPaymentMethod || 'bank_transfer'}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Bank: {paymentInstructions.bankName}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Account Name: {paymentInstructions.accountName}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        Account Number: {paymentInstructions.accountNumber}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        PromptPay: {paymentInstructions.promptPayName} •{' '}
                        {paymentInstructions.promptPayNumber}
                      </span>
                      {paymentInstructions.qrImageUrl ? (
                        <img
                          alt='Payment QR'
                          src={paymentInstructions.qrImageUrl}
                          style={{
                            width: '100%',
                            maxWidth: 260,
                            borderRadius: 12,
                            border: '1px solid #E8EFF4',
                            backgroundColor: theme.colors.white,
                          }}
                        />
                      ) : null}
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 13,
                          lineHeight: 1.7,
                          color: theme.colors.textColor,
                        }}
                      >
                        {paymentInstructions.note}
                      </span>
                    </div>
                  ) : null}
                  {canSubmitTransferSlip(order) ? (
                    <div
                      style={{
                        marginBottom: 22,
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      {submitErrorMessage ? (
                        <p
                          style={{
                            margin: 0,
                            ...theme.fonts.Mulish_400Regular,
                            fontSize: 14,
                            lineHeight: 1.6,
                            color: '#FF4343',
                          }}
                        >
                          {submitErrorMessage}
                        </p>
                      ) : null}
                      <label
                        style={{
                          width: '100%',
                          minHeight: 52,
                          borderRadius: 12,
                          border: '1px solid #E8EFF4',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          cursor: 'pointer',
                          backgroundColor: theme.colors.white,
                          color: theme.colors.mainColor,
                        }}
                      >
                        <span
                          style={{
                            ...theme.fonts.Mulish_400Regular,
                            fontSize: 14,
                            lineHeight: 1.5,
                            color: transferSlipFileNames[order.orderId]
                              ? theme.colors.mainColor
                              : theme.colors.textColor,
                          }}
                        >
                          {transferSlipFileNames[order.orderId] ||
                            'Choose transfer slip image'}
                        </span>
                        <span
                          style={{
                            ...theme.fonts.Mulish_700Bold,
                            fontSize: 12,
                            color: theme.colors.mainColor,
                          }}
                        >
                          Choose Image
                        </span>
                        <input
                          accept='image/*'
                          onChange={async event => {
                            const file = event.target.files?.[0];

                            if (!file) {
                              return;
                            }

                            setSubmitErrorMessage('');

                            try {
                              const result = await resizeTransferSlipImage(file);
                              setTransferSlipUrls(current => ({
                                ...current,
                                [order.orderId]: result,
                              }));
                              setTransferSlipFileNames(current => ({
                                ...current,
                                [order.orderId]: file.name,
                              }));
                            } catch (error) {
                              console.error(error);
                              setSubmitErrorMessage(
                                'Unable to prepare your transfer slip image right now.',
                              );
                            } finally {
                              event.target.value = '';
                            }
                          }}
                          style={{display: 'none'}}
                          type='file'
                        />
                      </label>
                      {transferSlipUrls[order.orderId] ? (
                        <img
                          alt='Transfer slip preview'
                          src={transferSlipUrls[order.orderId]}
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
                      <input
                        className='input-field'
                        onChange={event =>
                          setTransferSlipNotes(current => ({
                            ...current,
                            [order.orderId]: event.target.value,
                          }))
                        }
                        placeholder='Optional transfer note'
                        aria-label='Optional transfer note'
                        style={{
                          width: '100%',
                          height: 44,
                          borderRadius: 12,
                          border: '1px solid #E8EFF4',
                          padding: '0 14px',
                          outline: 'none',
                          color: theme.colors.mainColor,
                        }}
                        value={transferSlipNotes[order.orderId] || ''}
                      />
                      <components.Button
                        title={
                          submittingOrderId === order.orderId
                            ? 'Submitting...'
                            : 'Submit Transfer Slip'
                        }
                        onClick={() => handleTransferSlipSubmit(order)}
                      />
                    </div>
                  ) : null}
                  <div
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                >
                    <button style={{margin: 0, padding: 0, lineHeight: 0}}>
                      <svg.RepeatOrderSvg />
                    </button>
                    <button style={{lineHeight: 0}}>
                      <svg.LeaveAReviewSvg />
                    </button>
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
