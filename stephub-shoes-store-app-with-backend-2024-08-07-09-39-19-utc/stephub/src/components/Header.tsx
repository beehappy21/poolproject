import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {animated, useSpring} from '@react-spring/web';

import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {formatTHB} from '../utils/currency';
import {RootState} from '../store';
import {components} from '../components';
import {actions} from '../store/actions';

type Props = {
  title?: string;
  line?: boolean;
  burger?: boolean;
  goBack?: boolean;
  basket?: boolean;
  fixed?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export const Header: React.FC<Props> = ({
  line,
  goBack,
  fixed,
  searchValue,
  searchPlaceholder,
  onSearchChange,
}) => {
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [localSearchValue, setLocalSearchValue] = useState('');

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
            padding: 10,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          onClick={() => navigate(-1)}
        >
          <svg.GoBackSvg />
        </button>
      );
    }

    return null;
  };

  const renderBurger = (): JSX.Element => {
    return (
      <button
        style={{
          padding: 10,
          cursor: 'pointer',
          backgroundColor: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        onClick={() => setModal(true)}
      >
        <svg.BurgerSvg />
      </button>
    );
  };

  const renderSearch = (): JSX.Element => {
    const value = onSearchChange ? searchValue || '' : localSearchValue;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (onSearchChange) {
        onSearchChange(event);
        return;
      }

      setLocalSearchValue(event.target.value);
    };

    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: 40,
          borderRadius: 999,
          border: `1px solid ${theme.colors.aliceBlue2}`,
          backgroundColor: '#F7FAFC',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
          paddingRight: 14,
          gap: 10,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            border: '2px solid #60708E',
            borderRadius: '50%',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 8,
              height: 2,
              backgroundColor: '#60708E',
              right: -5,
              bottom: -2,
              transform: 'rotate(45deg)',
              borderRadius: 2,
            }}
          />
        </div>
        <input
          value={value}
          onChange={handleChange}
          placeholder={searchPlaceholder || 'ค้นหาสินค้า'}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: theme.colors.mainColor,
            fontSize: 14,
            ...theme.fonts.Mulish_400Regular,
          }}
        />
      </div>
    );
  };

  const renderBasket = (): JSX.Element => {
    return (
      <button
        onClick={handleOnClick}
        style={{
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          borderRadius: 12,
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <svg.BasketSvg />
        <div
          style={{
            paddingLeft: 6,
            paddingRight: 6,
            borderRadius: 10,
            right: 8,
            top: 4,
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
          {cart.length > 0 ? formatTHB(total) : '฿0.00'}
        </div>
      </button>
    );
  };

  const renderModal = (): JSX.Element => {
    const quickLinks = [
      {label: 'หน้าแรก', onClick: () => dispatch(actions.setScreen('Home'))},
      {label: 'สินค้า', onClick: () => dispatch(actions.setScreen('Search'))},
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
                  link.label === 'สินค้า' ||
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
          left: 0,
          right: 0,
          height: 64,
          position: fixed ? 'fixed' : 'sticky',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: theme.colors.white,
          zIndex: 40,
          borderBottom: line ? `1px solid ${theme.colors.aliceBlue2}` : 'none',
          paddingLeft: 12,
          paddingRight: 8,
          gap: 8,
        }}
      >
        {renderBurger()}
        {renderGoBack()}
        {renderSearch()}
        {renderBasket()}
      </header>
    </>
  );
};
