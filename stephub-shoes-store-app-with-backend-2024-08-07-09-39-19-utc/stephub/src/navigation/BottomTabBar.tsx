import React from 'react';
import {useNavigate} from 'react-router-dom';

import {hooks} from '../hooks';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {actions} from '../store/actions';

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

  const currentTabScreen = hooks.useAppSelector(state => state.tabSlice.screen);

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
            onClick={() => {
              dispatch(actions.setScreen(tab.name));
              navigate('/TabNavigator');
            }}
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
                currentTabScreen === tab.name
                  ? theme.colors.mainYellow
                  : '#8C99B1'
              }
            />
            <span
              style={{
                fontSize: 11,
                lineHeight: 1.2,
                color:
                  currentTabScreen === tab.name
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
