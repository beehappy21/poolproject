import React, {useEffect} from 'react';

import {items} from '../../items';
import {custom} from '../../custom';
import {svg} from '../../assets/svg';
import {theme} from '../../constants';
import {components} from '../../components';
import {actions} from '../../store/actions';
import {hooks, RootState} from '../../hooks';

export const Order: React.FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const {subtotal, delivery, discount, list, total, discountAmount} =
    hooks.useAppSelector((state: RootState) => state.cartSlice);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderHeader = (): JSX.Element | null => {
    return (
      <components.Header
        title='Order'
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
          {list?.map((item, index, array) => {
            const isLast = index === array.length - 1;
            return <items.OrderItem key={index} item={item} isLast={isLast} />;
          })}
        </div>
      );
    }

    return null;
  };

  const renderAppliedText = (): JSX.Element | null => {
    if (discount > 0) {
      return (
        <div style={{marginBottom: 30, padding: '0 20px'}}>
          <svg.PromocodeAppliedSvg />
        </div>
      );
    }

    return null;
  };

  const renderApplyPromocode = (): JSX.Element | null => {
    if (discount > 0) return null;

    return (
      <div
        style={{
          marginBottom: 60,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
        }}
      >
        <custom.InputField
          label='promocode'
          containerStyle={{width: 'calc(70% - 5px)'}}
          placeholder={'Enter the promocode'}
        />
        <components.Button
          title='Apply'
          containerStyle={{padding: 0, width: 'calc(30% - 5px)'}}
          onClick={() => {
            dispatch(actions.setDiscount(20));
          }}
        />
      </div>
    );
  };

  const renderTotal = (): JSX.Element | null => {
    if (list.length > 0) {
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
              Subtotal
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
              ${subtotal.toFixed(2).replace('.', ',')}
            </span>
          </div>
          {discount > 0 && (
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
                Discount
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
                - {discountAmount}
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
              Delivery
            </h5>
            <span
              style={{
                color: delivery === 0 ? '#51BA74' : theme.colors.textColor,
                lineHeight: 1.5,
              }}
            >
              {`${delivery === 0 ? 'Free' : `$${delivery.toFixed(2)}`}`}
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
              Total
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
              ${total.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderButton = (): JSX.Element | null => {
    return (
      <components.Button
        title='Shipping & Payment info'
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
        {renderAppliedText()}
        {renderApplyPromocode()}
        {renderTotal()}
        {renderButton()}
      </div>
    );
  };

  const renderBottomTabBar = (): JSX.Element | null => {
    return <components.BottomTabBar />;
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
      {renderBottomTabBar()}
    </>
  );
};
