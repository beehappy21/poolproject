import React, {useEffect} from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {svg} from '../assets/svg';
import {components} from '../components';
import {actions} from '../store/actions';
import {RootState} from '../hooks';

export const ShippingAndPaymentInfo: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const dispatch = hooks.useAppDispatch();
  const payment = hooks.useAppSelector(
    (state: RootState) => state.paymentSlice,
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderHeader = () => {
    return <components.Header title='Shipping & payment info' goBack={true} />;
  };

  const renderContent = (): JSX.Element => {
    return (
      <div style={{padding: '40px 20px 20px 20px'}}>
        <custom.InputField
          placeholder='enter your name'
          label='Name'
          icon={<svg.InputCheckSvg />}
          containerStyle={{marginBottom: 20}}
          onChange={event => dispatch(actions.setPaymentName(event.target.value))}
          value={payment.name}
        />
        <custom.InputField
          placeholder='enter your phone number'
          label='Phone number'
          containerStyle={{
            marginBottom: 20,
          }}
          onChange={event =>
            dispatch(actions.setPaymentPhoneNumber(event.target.value))
          }
          value={payment.phoneNumber}
        />
        <custom.InputField
          placeholder='enter your email'
          label='Email'
          containerStyle={{
            marginBottom: 20,
          }}
          onChange={event => dispatch(actions.setPaymentEmail(event.target.value))}
          value={payment.email}
        />
        <custom.InputField
          placeholder='enter your address'
          label='delivery address'
          containerStyle={{
            marginBottom: 20,
          }}
          onChange={event =>
            dispatch(actions.setPaymentAddress(event.target.value))
          }
          value={payment.address}
        />
        <custom.InputField
          placeholder='enter your card number'
          label='card number'
          containerStyle={{
            marginBottom: 20,
          }}
          onChange={event =>
            dispatch(actions.setPaymentCardNumber(event.target.value))
          }
          value={payment.cardNumber}
        />
        <div
          style={{
            flexDirection: 'row',
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <custom.InputField
            label='MM/yy'
            placeholder='MM/YY'
            containerStyle={{width: 'calc(50% - 5px)'}}
            onChange={event =>
              dispatch(actions.setPaymentExpiryDate(event.target.value))
            }
            value={payment.expiryDate}
          />
          <custom.InputField
            label='cvv'
            placeholder='•••'
            containerStyle={{width: 'calc(50% - 5px)'}}
            onChange={event => dispatch(actions.setPaymentCvv(event.target.value))}
            value={payment.cvv}
          />
        </div>
        <components.Button
          title='proceed to checkout'
          onClick={() => {
            navigate('/Checkout');
          }}
        />
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
