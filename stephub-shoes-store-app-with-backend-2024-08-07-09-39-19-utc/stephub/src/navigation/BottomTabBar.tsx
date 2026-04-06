import React from 'react';
import {useLocation, useNavigate} from 'react-router-dom';

import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {actions} from '../store/actions';
import {RootState} from '../store';

const tabs = [
  {
    id: 1,
    name: 'Home',
    label: 'หน้าแรก',
    icon: svg.HomeTabSvg,
  },
  {
    id: 2,
    name: 'Search',
    label: 'สินค้า',
    icon: svg.CategoryTabSvg,
  },
  {
    id: 3,
    name: 'Order',
    label: 'ตะกร้า',
    icon: svg.OrderTabSvg,
  },
  {
    id: 4,
    name: 'Wishlist',
    label: 'รายการโปรด',
    icon: svg.WishlistTabSvg,
  },
  {
    id: 5,
    name: 'Profile',
    label: 'โปรไฟล์',
    icon: svg.ProfileTabSvg,
  },
];

export const BottomTabBar: React.FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);

  const currentTabScreen = hooks.useAppSelector(state => state.tabSlice.screen);
  const isAuthenticated = Boolean(user?.accessToken);
  const isPublicCatalogRoute =
    location.pathname === '/' ||
    location.pathname === '/Product' ||
    location.pathname === '/Shop' ||
    location.pathname === '/Reviews' ||
    location.pathname === '/Description';

  const activeTabName = (() => {
    if (!isAuthenticated && isPublicCatalogRoute) {
      return location.pathname === '/Shop' ? 'Search' : 'Home';
    }

    return currentTabScreen;
  })();

  const openProtectedTab = (
    tabName: 'Order' | 'Wishlist' | 'Profile',
    loginMessage: string,
  ) => {
    navigate('/SignIn', {
      state: {
        returnTo: '/TabNavigator',
        tabScreen: tabName,
        loginMessage,
      },
    });
  };

  const handleTabClick = (tabName: string) => {
    if (!isAuthenticated) {
      if (tabName === 'Home' || tabName === 'Search') {
        navigate('/');
        return;
      }

      if (tabName === 'Order') {
        openProtectedTab('Order', 'กรุณาเข้าสู่ระบบก่อนสั่งซื้อสินค้า');
        return;
      }

      if (tabName === 'Wishlist') {
        openProtectedTab('Wishlist', 'กรุณาเข้าสู่ระบบก่อนดูรายการโปรด');
        return;
      }

      if (tabName === 'Profile') {
        openProtectedTab('Profile', 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งานโปรไฟล์');
        return;
      }
    }

    dispatch(actions.setScreen(tabName));
    navigate('/TabNavigator');
  };

  return (
    <nav
      style={{
        height: 64,
        bottom: 0,
        position: 'fixed',
        zIndex: 4,
        width: '100%',
        maxWidth: 768,
      }}
    >
      <div
        style={{
          flexDirection: 'row',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '100%',
          position: 'relative',
          backgroundColor: theme.colors.mainColor,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            type='button'
            onClick={() => handleTabClick(tab.name)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              minWidth: 52,
              border: 'none',
              backgroundColor: 'transparent',
              padding: 0,
              margin: 0,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <tab.icon
              color={
                activeTabName === tab.name
                  ? theme.colors.mainYellow
                  : '#8C99B1'
              }
            />
            <span
              style={{
                fontSize: 11,
                lineHeight: 1.2,
                color:
                  activeTabName === tab.name
                    ? theme.colors.mainYellow
                    : '#8C99B1',
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};
