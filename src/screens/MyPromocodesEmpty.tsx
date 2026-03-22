import {FC} from 'react';

import {custom} from '../custom';
import {theme} from '../constants';
import {components} from '../components';

export const MyPromocodesEmpty: FC = () => {
  const renderHeader = (): JSX.Element => {
    return <components.Header goBack={true} title='My promocodes' />;
  };

  const renderContent = (): JSX.Element => {
    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <img
          src={require('../assets/icons/16.png')}
          alt='order successful'
          style={{
            width: 225.18,
            display: 'block',
            margin: '0 auto',
            marginBottom: 14,
          }}
        />
        <h2
          style={{
            margin: 0,
            textAlign: 'center',
            ...theme.fonts.Mulish_700Bold,
            fontSize: 22,
            lineHeight: 1.2,
            color: theme.colors.mainColor,
            marginBottom: 14,
            textTransform: 'capitalize',
            whiteSpace: 'pre-line',
          }}
        >
          Your don’t have{'\n'}promocodes yet!
        </h2>
        <p
          style={{
            margin: '0 20px',
            textAlign: 'center',
            color: theme.colors.textColor,
            lineHeight: 1.7,
            marginBottom: 30,
          }}
        >
          Stay tuned for exclusive offers to elevate your plant shopping
          experience.
        </p>
        <custom.InputField
          label='Enter the voucher'
          placeholder='Promocode2024'
          containerStyle={{marginBottom: 20}}
        />
        <components.Button title='submit' onClick={() => {}} />
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
