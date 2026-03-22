import React, {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';

import {hooks} from '../../hooks';
import {items} from '../../items';
import {svg} from '../../assets/svg';
import {theme} from '../../constants';
import {RootState} from '../../store';
import {components} from '../../components';

export const Profile: React.FC = () => {
  const navigate = useNavigate();

  const {phoneVerified, emailVerified} = hooks.useAppSelector(
    (state: RootState) => state.verificationSlice,
  );
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderHeader = (): JSX.Element => {
    return (
      <components.Header
        title='My profile'
        burger={true}
        basket={true}
        line={true}
      />
    );
  };

  const renderUserInfo = (): JSX.Element => {
    return (
      <div
        style={{
          marginBottom: 29,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 20px',
        }}
      >
        <h3
          style={{
            fontSize: 20,
            marginBottom: 4,
            fontWeight: 'bold',
            ...theme.fonts.Mulish_700Bold,
            color: theme.colors.mainColor,
          }}
        >
          {user?.name || 'Stephub Member'}
        </h3>
        <span
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: theme.colors.textColor,
            ...theme.fonts.Mulish_400Regular,
          }}
        >
          {user?.email || user?.memberCode || 'Sign in to view your account'}
        </span>
      </div>
    );
  };

  const renderMenu = (): JSX.Element => {
    return (
      <>
        <items.ProfileItem
          title='Personal info'
          icon={<svg.UserSvg />}
          onClick={() => navigate('/EditProfile')}
        />
        <items.ProfileItem
          title='Order history'
          icon={<svg.CalendarSvg />}
          onClick={() => {
            navigate('/OrderHistory');
          }}
        />
        <items.ProfileItem
          title='My promocodes'
          icon={<svg.GiftSvg />}
          onClick={() => {
            navigate('/MyPromocodes');
            // navigate('/MyPromocodesEmpty');
          }}
        />
        <items.ProfileItem
          title={
            phoneVerified ? 'Phone number is verified' : 'Verify phone number'
          }
          onClick={() => {
            if (phoneVerified) {
              return alert('Your phone number is verified');
            }

            navigate('/SendPhoneOtp');
          }}
          goNavigation={true}
          titleStyle={{
            color: phoneVerified
              ? theme.colors.mainColor
              : theme.colors.coralRed,
          }}
          icon={
            <svg.SmartPhoneSvg
              circleColor={phoneVerified ? '#E8EFF4' : '#FF4343'}
              iconColor={phoneVerified ? '#60708E' : '#FF4343'}
            />
          }
          navIcon={!phoneVerified}
        />
        <items.ProfileItem
          title={emailVerified ? 'Email is verified' : 'Verify email'}
          onClick={() => {
            if (emailVerified) {
              return alert('Your email is verified');
            }

            navigate('/SendEmailOtp');
          }}
          goNavigation={true}
          titleStyle={{
            color: emailVerified
              ? theme.colors.mainColor
              : theme.colors.coralRed,
          }}
          icon={
            <svg.MailSvg
              circleColor={emailVerified ? '#E8EFF4' : '#FF4343'}
              iconColor={emailVerified ? '#60708E' : '#FF4343'}
            />
          }
          navIcon={!emailVerified}
        />
        <items.ProfileItem
          title='Sign out'
          icon={<svg.LogOutSvg />}
          onClick={() => {
            navigate('/SignOut');
          }}
          navIcon={false}
        />
        <items.ProfileItem
          title='Delete account'
          icon={<svg.DeleteSvg />}
          onClick={() => {
            navigate('/DeleteAccount');
          }}
          navIcon={false}
          titleStyle={{
            color: theme.colors.coralRed,
          }}
        />
      </>
    );
  };

  const renderContent = () => {
    return (
      <div style={{paddingTop: 40, paddingBottom: 64 + 30}}>
        {renderUserInfo()}
        {renderMenu()}
      </div>
    );
  };

  const renderBottomTabBar = () => {
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
