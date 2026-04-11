import axios from 'axios';

import {useEffect, useState, FC, useCallback} from 'react';
import * as Accordion from '@radix-ui/react-accordion';

import {URLS} from '../config';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {formatTHBText} from '../utils/currency';
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
  fulfillmentMethod: 'delivery' | 'branch_pickup';
  pickupBranchName: string | null;
  pickupBranchNote: string | null;
  firstProductName: string | null;
  firstProductImageUrl: string | null;
  productItemCount: number;
  createdAt: string;
};

type OrderProductItem = {
  orderItemId: string;
  productDetailId: string | null;
  productCode: string | null;
  productName: string | null;
  productImageUrl: string | null;
  quantity: number;
  unitPriceUsdt: string;
  unitPv: string;
  lineTotalUsdt: string;
  lineTotalPv: string;
};

type LiveOrderDetail = LiveOrder & {
  items?: OrderProductItem[];
  productItems?: OrderProductItem[];
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
  const [expandedOrderId, setExpandedOrderId] = useState<string>('');
  const [orderDetails, setOrderDetails] = useState<Record<string, LiveOrderDetail>>(
    {},
  );
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [transferSlipUrls, setTransferSlipUrls] = useState<Record<string, string>>(
    {},
  );
  const [transferSlipFileNames, setTransferSlipFileNames] = useState<
    Record<string, string>
  >({});
  const [transferSlipNotes, setTransferSlipNotes] = useState<Record<string, string>>(
    {},
  );

  const normalizeApprovalStatus = (approvalStatus?: string | null): string => {
    return String(approvalStatus || '').trim().toLowerCase();
  };

  const isOrderApproved = (order: LiveOrder): boolean => {
    return normalizeApprovalStatus(order.approvalStatus) === 'approved';
  };

  const getOrderState = (order: LiveOrder): string => {
    if (order.fulfillmentMethod === 'branch_pickup') {
      if (order.deliveredAt) return 'รับสินค้าแล้ว';
      if (order.shippedAt) return 'พร้อมรับที่สาขา';
      if (isOrderApproved(order)) return 'รอรับที่สาขา';
    }

    if (order.deliveredAt) return 'ส่งถึงแล้ว';
    if (order.shippedAt) return 'จัดส่งแล้ว';
    if (isOrderApproved(order)) return 'รอจัดส่ง';
    if (order.transferSubmittedAt) return 'รอตรวจสอบการโอน';
    return 'รอชำระ';
  };

  const getOrderStateColor = (order: LiveOrder): string => {
    if (order.fulfillmentMethod === 'branch_pickup') {
      if (order.deliveredAt) return '#51BA74';
      if (order.shippedAt) return '#F5C102';
      if (isOrderApproved(order)) return theme.colors.mainColor;
    }

    if (order.deliveredAt) return '#51BA74';
    if (order.shippedAt) return '#F5C102';
    if (isOrderApproved(order)) return theme.colors.mainColor;
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
    if (order.fulfillmentMethod === 'branch_pickup') {
      if (order.deliveredAt) {
        return 'สร้างคำสั่งซื้อ -> ส่งสลิป -> อนุมัติ -> พร้อมรับที่สาขา -> รับสินค้าแล้ว';
      }

      if (order.shippedAt) {
        return 'สร้างคำสั่งซื้อ -> ส่งสลิป -> อนุมัติ -> พร้อมรับที่สาขา';
      }

      if (isOrderApproved(order)) {
        return 'สร้างคำสั่งซื้อ -> ส่งสลิป -> อนุมัติ -> รอรับที่สาขา';
      }
    }

    if (order.deliveredAt) {
      return 'สร้างคำสั่งซื้อ -> ส่งสลิป -> อนุมัติ -> จัดส่ง -> ส่งถึงแล้ว';
    }

    if (order.shippedAt) {
      return 'สร้างคำสั่งซื้อ -> ส่งสลิป -> อนุมัติ -> จัดส่ง';
    }

    if (isOrderApproved(order)) {
      return 'สร้างคำสั่งซื้อ -> ส่งสลิป -> อนุมัติ -> รอจัดส่ง';
    }

    if (order.transferSubmittedAt) {
      return 'สร้างคำสั่งซื้อ -> ส่งสลิป -> รอตรวจสอบการโอน';
    }

    return 'สร้างคำสั่งซื้อ -> รอชำระ';
  };

  const getApprovalStatusLabel = (approvalStatus: string): string => {
    if (normalizeApprovalStatus(approvalStatus) === 'approved') {
      return 'อนุมัติแล้ว';
    }

    return 'รอตรวจสอบ';
  };

  const canSubmitTransferSlip = (order: LiveOrder): boolean => {
    return !order.transferSubmittedAt && !isOrderApproved(order);
  };

  const shouldShowPaymentInstructions = (order: LiveOrder): boolean => {
    return !isOrderApproved(order);
  };

  const canDownloadReceipt = (order: LiveOrder): boolean => {
    return isOrderApproved(order) || !!order.shippedAt || !!order.deliveredAt;
  };

  const handleReceiptDownload = async (order: LiveOrder): Promise<void> => {
    if (!user?.accessToken) {
      setSubmitErrorMessage('กรุณาเข้าสู่ระบบก่อนดาวน์โหลดใบเสร็จ');
      return;
    }

    const receiptWindow = window.open('', '_blank');

    if (receiptWindow) {
      receiptWindow.document.write(
        '<!DOCTYPE html><html><head><title>กำลังโหลดใบเสร็จ</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">กำลังโหลดใบเสร็จ...</body></html>',
      );
      receiptWindow.document.close();
    }

    try {
      const response = await axios.get(
        URLS.buildAuthOrderReceiptUrl(order.orderId),
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
          withCredentials: true,
          responseType: 'blob',
        },
      );

      const blobUrl = window.URL.createObjectURL(response.data as Blob);

      if (receiptWindow) {
        receiptWindow.location.href = blobUrl;
      } else {
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.target = '_blank';
        downloadLink.download = `receipt-${order.orderNo}.html`;
        downloadLink.click();
      }

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60000);
    } catch (error) {
      console.error(error);
      if (receiptWindow) {
        receiptWindow.close();
      }
      setSubmitErrorMessage('ไม่สามารถโหลดใบเสร็จได้ในขณะนี้');
    }
  };

  const getOrders = useCallback(async (): Promise<void> => {
    if (!user?.accessToken) {
      setOrdersData([]);
      setPageErrorMessage('กรุณาเข้าสู่ระบบก่อนดูประวัติคำสั่งซื้อ');
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
      setPageErrorMessage('ไม่สามารถโหลดประวัติคำสั่งซื้อได้ในขณะนี้');
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

  const getOrderDetail = useCallback(
    async (orderId: string): Promise<void> => {
      if (!user?.accessToken || orderDetails[orderId]) {
        return;
      }

      setLoadingOrderId(orderId);

      try {
        const response = await axios.get<{order: LiveOrderDetail}>(
          URLS.buildAuthOrderDetailUrl(orderId),
          {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
            withCredentials: true,
          },
        );

        if (response.data?.order) {
          setOrderDetails(current => ({
            ...current,
            [orderId]: response.data.order,
          }));
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingOrderId(current =>
          current === orderId ? null : current,
        );
      }
    },
    [orderDetails, user?.accessToken],
  );

  const handleTransferSlipSubmit = async (order: LiveOrder): Promise<void> => {
    if (!user?.accessToken) {
      setSubmitErrorMessage('กรุณาเข้าสู่ระบบก่อนส่งสลิปโอนเงิน');
      return;
    }

    const transferSlipUrl = transferSlipUrls[order.orderId]?.trim();
    const transferSlipNote = transferSlipNotes[order.orderId]?.trim();

    if (!transferSlipUrl) {
      setSubmitErrorMessage(
        'กรุณาเลือกภาพสลิปโอนเงินก่อนส่ง',
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
          'ภาพสลิปมีขนาดใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กลง',
        );
      } else {
        setSubmitErrorMessage(
          error?.response?.data?.message ||
            'ไม่สามารถส่งสลิปโอนเงินได้ในขณะนี้',
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
    return <components.Header goBack={true} title='ประวัติคำสั่งซื้อ' />;
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
            title={user?.accessToken ? 'กลับหน้าแรก' : 'กลับไปเข้าสู่ระบบ'}
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
            ยังไม่มีคำสั่งซื้อ
          </p>
          <components.Button
            title='เลือกสินค้า'
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
        <Accordion.Root
          type='single'
          collapsible={true}
          value={expandedOrderId}
          onValueChange={value => {
            setExpandedOrderId(value);
            if (value) {
              void getOrderDetail(value);
            }
          }}
        >
          {ordersData.map((order, index) => {
            const orderDetail = orderDetails[order.orderId];
            const productItems =
              orderDetail?.productItems || orderDetail?.items || [];

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
                  {(order.firstProductName || order.productItemCount > 0) && (
                    <div
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      {order.firstProductImageUrl ? (
                        <img
                          src={order.firstProductImageUrl}
                          alt={order.firstProductName || 'สินค้า'}
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: 'cover',
                            flexShrink: 0,
                            borderRadius: 8,
                            backgroundColor: '#F3F6FB',
                          }}
                        />
                      ) : null}
                      <div
                        style={{
                          display: 'grid',
                          gap: 2,
                          minWidth: 0,
                          flex: 1,
                          textAlign: 'left',
                        }}
                      >
                        {order.firstProductName ? (
                          <span
                            style={{
                              ...theme.fonts.Mulish_600SemiBold,
                              fontSize: 13,
                              color: theme.colors.mainColor,
                              lineHeight: 1.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {order.firstProductName}
                          </span>
                        ) : null}
                        {order.productItemCount > 0 ? (
                          <span
                            style={{
                              ...theme.fonts.Mulish_400Regular,
                              fontSize: 12,
                              color: theme.colors.textColor,
                              lineHeight: 1.5,
                            }}
                          >
                            {order.productItemCount === 1
                              ? '1 รายการสินค้า'
                              : `${order.productItemCount} รายการสินค้า`}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
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
                      {formatTHBText(order.totalUsdt || 0)}
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
                      สถานะอนุมัติ: {getApprovalStatusLabel(order.approvalStatus)}
                    </span>
                    <span
                      style={{
                        ...theme.fonts.Mulish_400Regular,
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: theme.colors.textColor,
                      }}
                    >
                      วิธีรับสินค้า:{' '}
                      {order.fulfillmentMethod === 'branch_pickup'
                        ? 'รับที่สาขา'
                        : 'จัดส่งถึงที่'}
                    </span>
                    {order.fulfillmentMethod === 'branch_pickup' &&
                    order.pickupBranchName ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        สาขารับสินค้า: {order.pickupBranchName}
                      </span>
                    ) : null}
                    {order.fulfillmentMethod === 'branch_pickup' &&
                    order.pickupBranchNote ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        หมายเหตุรับสินค้า: {order.pickupBranchNote}
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
                        ส่งสลิปเมื่อ: {formatOrderDate(order.transferSubmittedAt)}
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
                        อนุมัติเมื่อ: {formatOrderDate(order.approvedAt)}
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
                        ส่งถึงเมื่อ: {formatOrderDate(order.deliveredAt)}
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
                        เลขพัสดุ: {order.shipmentTrackingNo}
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
                        ขนส่ง: {order.shipmentCarrier}
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
                        หมายเหตุจัดส่ง: {order.shipmentNote}
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
                      ไทม์ไลน์: {getTimelineLabel(order)}
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
                        เปิดสลิปโอนเงิน
                      </a>
                    ) : null}
                    {canDownloadReceipt(order) ? (
                      <button
                        type='button'
                        onClick={() => void handleReceiptDownload(order)}
                        style={{
                          width: 'fit-content',
                          border: '1px solid #B7D6C2',
                          borderRadius: 999,
                          padding: '10px 16px',
                          backgroundColor: '#EFFAF3',
                          color: '#20744A',
                          cursor: 'pointer',
                          ...theme.fonts.Mulish_700Bold,
                          fontSize: 13,
                          lineHeight: 1.4,
                        }}
                      >
                        ดาวน์โหลดใบเสร็จ
                      </button>
                    ) : null}
                  </div>
                  <div
                    style={{
                      marginBottom: 22,
                      display: 'grid',
                      gap: 10,
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
                      รายการสินค้า
                    </span>
                    {loadingOrderId === order.orderId && !productItems.length ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: theme.colors.textColor,
                        }}
                      >
                        กำลังโหลดรายการสินค้า...
                      </span>
                    ) : null}
                    {!loadingOrderId && !productItems.length ? (
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: theme.colors.textColor,
                        }}
                      >
                        ยังไม่มีรายละเอียดสินค้าในคำสั่งซื้อนี้
                      </span>
                    ) : null}
                    {productItems.map(productItem => (
                      <div
                        key={productItem.orderItemId}
                        style={{
                          display: 'grid',
                          gap: 6,
                          padding: 14,
                          borderRadius: 12,
                          backgroundColor: theme.colors.white,
                          border: '1px solid #E8EFF4',
                        }}
                      >
                        <span
                          style={{
                            ...theme.fonts.Mulish_700Bold,
                            fontSize: 14,
                            lineHeight: 1.5,
                            color: theme.colors.mainColor,
                          }}
                        >
                          {productItem.productName || 'สินค้า'}
                        </span>
                        {productItem.productCode ? (
                          <span
                            style={{
                              ...theme.fonts.Mulish_400Regular,
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: theme.colors.textColor,
                            }}
                          >
                            รหัสสินค้า: {productItem.productCode}
                          </span>
                        ) : null}
                        <span
                          style={{
                            ...theme.fonts.Mulish_400Regular,
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: theme.colors.textColor,
                          }}
                        >
                          จำนวน: {productItem.quantity} • ราคา: $
                          {formatTHBText(productItem.unitPriceUsdt || 0)} • PV:{' '}
                          {productItem.unitPv}
                        </span>
                        <span
                          style={{
                            ...theme.fonts.Mulish_400Regular,
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: theme.colors.textColor,
                          }}
                        >
                          รวมรายการ: $
                          {formatTHBText(productItem.lineTotalUsdt || 0)}
                        </span>
                      </div>
                    ))}
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
                        ข้อมูลสำหรับชำระเงิน
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_700Bold,
                          fontSize: 18,
                          lineHeight: 1.5,
                          color: '#FF4343',
                        }}
                      >
                        ยอดที่ต้องโอน:{' '}
                        {formatTHBText(order.cashDueUsdt || order.totalUsdt || 0)}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        วิธีชำระ: {order.cashPaymentMethod || 'bank_transfer'}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        ธนาคาร: {paymentInstructions.bankName}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        ชื่อบัญชี: {paymentInstructions.accountName}
                      </span>
                      <span
                        style={{
                          ...theme.fonts.Mulish_400Regular,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: theme.colors.textColor,
                        }}
                      >
                        เลขบัญชี: {paymentInstructions.accountNumber}
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
                          alt='QR รับเงิน'
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
                            'เลือกภาพสลิปโอนเงิน'}
                        </span>
                        <span
                          style={{
                            ...theme.fonts.Mulish_700Bold,
                            fontSize: 12,
                            color: theme.colors.mainColor,
                          }}
                        >
                          เลือกรูป
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
                                'ไม่สามารถเตรียมภาพสลิปได้ในขณะนี้',
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
                        placeholder='หมายเหตุการโอนเงินเพิ่มเติม'
                        aria-label='หมายเหตุการโอนเงินเพิ่มเติม'
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
                            ? 'กำลังส่ง...'
                            : 'ส่งสลิปโอนเงิน'
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
                    {(() => {
                      const detail = orderDetails[order.orderId];
                      const reviewItem =
                        detail?.productItems?.find(item => item.productDetailId) ||
                        detail?.items?.find(item => item.productDetailId);
                      const canReview =
                        isOrderApproved(order) && Boolean(reviewItem?.productDetailId);

                      return (
                        <>
                          <button style={{margin: 0, padding: 0, lineHeight: 0}}>
                            <svg.RepeatOrderSvg />
                          </button>
                          {canReview ? (
                            <button
                              style={{lineHeight: 0}}
                              onClick={() =>
                                navigate('/LeaveAReview', {
                                  state: {
                                    productDetailId: reviewItem?.productDetailId || '',
                                    productName:
                                      reviewItem?.productName ||
                                      order.firstProductName ||
                                      'สินค้า',
                                  },
                                })
                              }
                            >
                              <svg.LeaveAReviewSvg />
                            </button>
                          ) : (
                            <span />
                          )}
                        </>
                      );
                    })()}
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
