import React from 'react';

import {hooks} from '../hooks';
import {screens} from '../screens';
import {RootState} from '../store';

export const TabNavigator: React.FC = () => {
  const currentTabScreen = hooks.useAppSelector(
    (state: RootState) => state.tabSlice.screen,
  );

  // console.log('productsData --->', JSON.stringify(productsData, null, 2));

  const cart = hooks.useAppSelector((state: RootState) => state.cartSlice.list);
  const wishlist = hooks.useAppSelector(
    (state: RootState) => state.wishlistSlice.list,
  );

  const renderScreen = (): JSX.Element => {
    return (
      <>
        {/* {renderBurgerMenu()} */}
        {currentTabScreen === 'Home' && <screens.Home />}
        {currentTabScreen === 'Search' && <screens.Categories />}
        {currentTabScreen === 'Order' && cart.length > 0 ? (
          <screens.Order />
        ) : currentTabScreen === 'Order' && cart.length === 0 ? (
          <screens.CartEmpty />
        ) : null}
        {currentTabScreen === 'Wishlist' && wishlist.length > 0 ? (
          <screens.Wishlist />
        ) : currentTabScreen === 'Wishlist' && wishlist.length === 0 ? (
          <screens.WishlistEmpty />
        ) : null}
        {currentTabScreen === 'Profile' && <screens.Profile />}
      </>
    );
  };

  return renderScreen();
};
