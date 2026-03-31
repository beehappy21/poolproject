import axios from 'axios';
import React, {useEffect, useMemo, useState} from 'react';

import {items} from '../../items';
import {URLS} from '../../config';
import {theme} from '../../constants';
import {formatTHB} from '../../utils/currency';
import {components} from '../../components';
import {actions} from '../../store/actions';
import {hooks, RootState} from '../../hooks';
import {ProductType} from '../../types';
import {fetchLiveProducts} from '../../utils/liveCatalog';

const parseDecimal = (value?: string | number | null) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const Order: React.FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const [catalogProducts, setCatalogProducts] = useState<ProductType[]>([]);
  const [dcwWalletBalance, setDcwWalletBalance] = useState(0);
  const [dcwInputValue, setDcwInputValue] = useState('');

  const {subtotal, delivery, list, total, discountAmount, discountWalletAmount} =
    hooks.useAppSelector((state: RootState) => state.cartSlice);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setDcwInputValue(
      discountWalletAmount > 0 ? String(Math.floor(discountWalletAmount)) : '',
    );
  }, [discountWalletAmount]);

  useEffect(() => {
    let mounted = true;

    const loadOrderPageData = async () => {
      try {
        const products = await fetchLiveProducts();
        let nextDcwWalletBalance = 0;

        if (user?.accessToken) {
          const dashboardResponse = await axios.get(URLS.AUTH_DASHBOARD, {
            headers: {
              Authorization: `Bearer ${user.accessToken}`,
            },
            withCredentials: true,
          });

          nextDcwWalletBalance = parseDecimal(
            dashboardResponse.data?.wallet?.discountBalance,
          );
        }

        if (mounted) {
          setCatalogProducts(products);
          setDcwWalletBalance(nextDcwWalletBalance);
        }
      } catch (error) {
        console.error('Unable to load cart metadata', error);
      }
    };

    loadOrderPageData();

    return () => {
      mounted = false;
    };
  }, [user?.accessToken]);

  const catalogProductByDetailId = useMemo(() => {
    return new Map(
      catalogProducts
        .filter(product => product.productDetailId)
        .map(product => [String(product.productDetailId), product]),
    );
  }, [catalogProducts]);

  const getCartProductDcwMeta = (item: ProductType) => {
    const fallbackProduct = item.productDetailId
      ? catalogProductByDetailId.get(String(item.productDetailId))
      : undefined;

    return {
      dcwSpendEnabled:
        item.dcwSpendEnabled ?? fallbackProduct?.dcwSpendEnabled ?? false,
      dcwUsageAmount:
        item.dcwUsageAmount ?? fallbackProduct?.dcwUsageAmount ?? 0,
      dcwRewardRate:
        item.dcwRewardRate ?? fallbackProduct?.dcwRewardRate ?? 0,
    };
  };

  const cartDcwUsageAvailable = list.reduce((sum, item) => {
    const dcwMeta = getCartProductDcwMeta(item);

    if (!dcwMeta.dcwSpendEnabled) {
      return sum;
    }

    const quantity = Math.max(1, Number(item.quantity || 1));
    return sum + Number(dcwMeta.dcwUsageAmount || 0) * quantity;
  }, 0);

  const cartDcwRewardEstimate = list.reduce((sum, item) => {
    const dcwMeta = getCartProductDcwMeta(item);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const lineTotal = Number(item.price || 0) * quantity;
    const rewardRatePercent = Number(dcwMeta.dcwRewardRate || 0);

    if (rewardRatePercent <= 0 || lineTotal <= 0) {
      return sum;
    }

    return sum + Math.floor(lineTotal * (rewardRatePercent / 100));
  }, 0);

  const dcwInputMax = Math.max(
    0,
    Math.min(cartDcwUsageAvailable, Math.floor(dcwWalletBalance)),
  );

  useEffect(() => {
    const nextAmount = Math.max(
      0,
      Math.min(dcwInputMax, Number(discountWalletAmount || 0)),
    );

    if (nextAmount !== Number(discountWalletAmount || 0)) {
      dispatch(actions.setDiscountWalletAmount(nextAmount));
    }
  }, [dcwInputMax, discountWalletAmount, dispatch]);

  const handleDcwInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value.replace(/[^\d]/g, '');
    setDcwInputValue(rawValue);

    const nextAmount = Math.max(
      0,
      Math.min(dcwInputMax, Number(rawValue || 0)),
    );

    dispatch(actions.setDiscountWalletAmount(nextAmount));
  };

  const renderHeader = (): JSX.Element | null => {
    return (
      <components.Header
        title='ตะกร้าสินค้า'
        burger={true}
        basket={true}
        line={true}
      />
    );
  };

  const renderProducts = (): JSX.Element | null => {
    if (list.length > 0) {
      return (
        <div
          style={{
            marginBottom: 30,
            borderBottom: `1px solid ${theme.colors.lavenderMist}`,
          }}
        >
          {list.map((item, index, array) => {
            const isLast = index === array.length - 1;
            return <items.OrderItem key={index} item={item} isLast={isLast} />;
          })}
        </div>
      );
    }

    return null;
  };

  const renderTotal = (): JSX.Element | null => {
    if (list.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          marginBottom: 20,
          padding: '0 20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 14,
            gap: 16,
          }}
        >
          <h5
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            DCW ใช้ได้
          </h5>
          <div
            style={{
              width: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 6,
            }}
          >
            <div
              style={{
                width: '100%',
                height: 44,
                borderRadius: 12,
                border: `1px solid ${theme.colors.lavenderMist}`,
                padding: '0 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                backgroundColor: '#fff',
                boxSizing: 'border-box',
              }}
            >
              <input
                type='text'
                inputMode='numeric'
                value={dcwInputValue}
                onChange={handleDcwInputChange}
                placeholder='0'
                style={{
                  width: 72,
                  border: 'none',
                  textAlign: 'right',
                  fontSize: 16,
                  color: theme.colors.mainColor,
                  outline: 'none',
                  backgroundColor: 'transparent',
                }}
              />
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 16,
                  color: theme.colors.textColor,
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                }}
              >
                /{Math.floor(dcwWalletBalance).toLocaleString()}
              </span>
            </div>
            <span
              style={{
                margin: 0,
                ...theme.fonts.Mulish_600SemiBold,
                fontSize: 13,
                color: theme.colors.textColor,
                lineHeight: 1.4,
              }}
            >
              ใช้ได้สูงสุด {dcwInputMax.toLocaleString()}
            </span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <h5
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            DCW ที่จะได้รับ
          </h5>
          <span
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            {cartDcwRewardEstimate.toLocaleString()}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <h5
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              color: theme.colors.mainColor,
              lineHeight: 1.5,
            }}
          >
            มูลค่าสินค้า
          </h5>
          <span
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              color: theme.colors.mainColor,
              lineHeight: 1.5,
            }}
          >
            {formatTHB(subtotal)}
          </span>
        </div>
        {discountAmount > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <h5
              style={{
                margin: 0,
                ...theme.fonts.Mulish_600SemiBold,
                fontSize: 16,
                color: theme.colors.textColor,
                lineHeight: 1.5,
              }}
            >
              ส่วนลด
            </h5>
            <span
              style={{
                margin: 0,
                ...theme.fonts.Mulish_600SemiBold,
                fontSize: 16,
                color: theme.colors.textColor,
                lineHeight: 1.5,
              }}
            >
              - {formatTHB(discountAmount)}
            </span>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            borderBottom: `1px solid ${theme.colors.lavenderMist}`,
            paddingBottom: 10,
          }}
        >
          <h5
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 16,
              color: theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            ค่าจัดส่ง
          </h5>
          <span
            style={{
              color: delivery === 0 ? '#51BA74' : theme.colors.textColor,
              lineHeight: 1.5,
            }}
          >
            {delivery === 0 ? 'ฟรี' : formatTHB(delivery)}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h4
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 18,
              color: theme.colors.mainColor,
              lineHeight: 1.5,
            }}
          >
            ยอดรวมทั้งหมด
          </h4>
          <span
            style={{
              margin: 0,
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 18,
              color: theme.colors.mainColor,
              lineHeight: 1.5,
            }}
          >
            {formatTHB(total)}
          </span>
        </div>
      </div>
    );
  };

  const renderButton = (): JSX.Element | null => {
    return (
      <components.Button
        title='กรอกข้อมูลจัดส่ง'
        colorScheme='light'
        onClick={() => {
          navigate('/ShippingAndPaymentInfo');
        }}
        containerStyle={{padding: '0 20px'}}
      />
    );
  };

  const renderContent = (): JSX.Element | null => {
    return (
      <div style={{paddingTop: 20, paddingBottom: 64 + 20}}>
        {renderProducts()}
        {renderTotal()}
        {renderButton()}
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
