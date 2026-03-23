import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {animated, useSpring} from '@react-spring/web';

import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {RootState} from '../store';
import {components} from '../components';
import {actions} from '../store/actions';

type Props = {
  title?: string;
  line?: boolean;
  burger?: boolean;
  goBack?: boolean;
  basket?: boolean;
};

export const Header: React.FC<Props> = ({
  line,
  title,
  burger,
  goBack,
  basket,
}) => {
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);

  const backdropAnimation = useSpring({
    opacity: modal ? 1 : 0,
    display: modal ? 'block' : 'none',
  });

  const dispatch = hooks.useAppDispatch();

  useEffect(() => {
    if (modal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
    // document.body.style.overflow = 'hidden';
  }, [modal]);

  const cart = hooks.useAppSelector((state: RootState) => state.cartSlice.list);
  const total = hooks.useAppSelector(
    (state: RootState) => state.cartSlice.total,
  );

  const handleOnClick = () => {
    if (cart.length > 0) {
      dispatch(actions.setScreen('Order'));
      navigate('/TabNavigator');
      return;
    }

    return alert('ยังไม่มีสินค้าในตะกร้า');
  };

  const renderGoBack = (): JSX.Element | null => {
    if (goBack) {
      return (
        <button
          style={{
            position: 'absolute',
            left: 0,
            padding: 20,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
          }}
          onClick={() => navigate(-1)}
        >
          <svg.GoBackSvg />
        </button>
      );
    }

    return null;
  };

  const renderBurger = (): JSX.Element | null => {
    if (burger) {
      return (
        <button
          style={{
            position: 'absolute',
            left: 0,
            padding: 20,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
          }}
          onClick={() => setModal(true)}
        >
          <svg.BurgerSvg />
        </button>
      );
    }

    return null;
  };

  const renderTitle = (): JSX.Element => {
    return (
      <h4
        style={{
          width: 'calc(100% - 100px)',
          textAlign: 'center',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          ...theme.fonts.Mulish_600SemiBold,
          fontSize: 18,
          color: theme.colors.mainColor,
        }}
      >
        {title}
      </h4>
    );
  };

  const renderBasket = (): JSX.Element | null => {
    if (basket) {
      return (
        <button
          onClick={handleOnClick}
          style={{
            position: 'absolute',
            right: 0,
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 20,
            paddingRight: 20,
            borderRadius: 12,
          }}
        >
          <svg.BasketSvg />
          <div
            style={{
              paddingLeft: 6,
              paddingRight: 6,
              borderRadius: 10,
              right: 35,
              bottom: 10,
              position: 'absolute',
              display: 'flex',
              paddingTop: 2,
              paddingBottom: 2,
              fontSize: 10,
              color: theme.colors.white,
              ...theme.fonts.Mulish_700Bold,
              backgroundColor: theme.colors.coralRed,
            }}
          >
            {cart.length > 0 ? `$${total.toFixed(2)}` : '$0'}
          </div>
        </button>
      );
    }

    return null;
  };

  const renderModal = (): JSX.Element => {
    const quickLinks = [
      {label: 'หน้าแรก', onClick: () => dispatch(actions.setScreen('Home'))},
      {label: 'แพ็กเกจ', onClick: () => dispatch(actions.setScreen('Search'))},
      {label: 'ตะกร้า', onClick: () => dispatch(actions.setScreen('Order'))},
      {label: 'ประวัติคำสั่งซื้อ', onClick: () => navigate('/OrderHistory')},
      {label: 'โปรไฟล์', onClick: () => dispatch(actions.setScreen('Profile'))},
      {label: 'ออกจากระบบ', onClick: () => navigate('/SignOut')},
    ];

    return (
      <animated.div
        className={`${modal ? 'slide-in container' : 'container'}`}
        style={{
          position: 'fixed',
          height: '100%',
          zIndex: 999999,
          backgroundColor: theme.colors.mainColor,
          ...backdropAnimation,
          paddingTop: 60,
        }}
      >
        <div
          style={{
            width: 2,
            backgroundColor: theme.colors.white,
            height: 30,
            borderRadius: 10,
            margin: '0 20px',
            marginBottom: 14,
          }}
        />
        <h2
          style={{
            padding: '0 20px',
            ...theme.fonts.Mulish_700Bold,
            fontSize: 22,
            textTransform: 'capitalize',
            marginBottom: 18,
            textAlign: 'left',
          }}
        >
          เมนู
        </h2>
        <div style={{padding: '0 20px', marginBottom: 24}}>
          {quickLinks.map(link => (
            <button
              key={link.label}
              onClick={() => {
                setModal(false);
                link.onClick();
                if (
                  link.label === 'หน้าแรก' ||
                  link.label === 'แพ็กเกจ' ||
                  link.label === 'ตะกร้า' ||
                  link.label === 'โปรไฟล์'
                ) {
                  navigate('/TabNavigator');
                }
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 0',
                color: theme.colors.white,
                fontSize: 16,
                borderBottom: `1px solid ${theme.colors.lavenderMist}20`,
                ...theme.fonts.Mulish_600SemiBold,
              }}
            >
              {link.label}
            </button>
          ))}
        </div>
        <h3
          style={{
            padding: '0 20px',
            ...theme.fonts.Mulish_700Bold,
            fontSize: 18,
            textTransform: 'capitalize',
            marginBottom: 18,
            textAlign: 'left',
          }}
        >
          ติดต่อเรา
        </h3>
        <components.BurgerMenuItem
          titleLine1='27 Division St, New York,'
          titleLine2='NY 10002, USA'
          icon={<svg.MapPinSvg />}
        />
        <components.BurgerMenuItem
          titleLine1='stephubsale@mail.com'
          titleLine2='stephubsupport@mail.com'
          icon={<svg.ModalMailSvg />}
        />
        <components.BurgerMenuItem
          titleLine1='+17  123456789'
          titleLine2='+17  987654321'
          icon={<svg.PhoneCallSvg />}
        />
      </animated.div>
    );
  };

  const renderOverlay = (): JSX.Element => {
    return (
      <animated.div
        className='container'
        style={{
          width: '100%',
          height: '100vh',
          backgroundColor: 'rgba(25, 51, 100, 0.6)',
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          overflow: 'hidden',
          ...backdropAnimation,
        }}
        onClick={() => setModal(false)}
      />
    );
  };

  return (
    <>
      {renderOverlay()}
      {renderModal()}
      <header
        style={{
          top: 0,
          height: 52,
          position: 'sticky',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: 'row',
          backgroundColor: theme.colors.white,
          zIndex: 4,
          borderBottom: line ? `1px solid ${theme.colors.aliceBlue2}` : 'none',
        }}
      >
        {renderGoBack()}
        {renderBurger()}
        {renderTitle()}
        {renderBasket()}
      </header>
    </>
  );
};
