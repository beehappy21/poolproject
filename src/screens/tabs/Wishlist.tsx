import React from 'react';

import {hooks} from '../../hooks';
import {items} from '../../items';
import {RootState} from '../../store';
import {components} from '../../components';

export const Wishlist: React.FC = () => {
  const wishlist = hooks.useAppSelector(
    (state: RootState) => state.wishlistSlice.list,
  );

  const renderBottomTabBar = () => {
    return <components.BottomTabBar />;
  };

  const renderContent = () => {
    return (
      <div style={{paddingTop: 20, paddingBottom: 64 + 20}}>
        {wishlist.map((item: any, index: number) => {
          const isLast = index === wishlist.length - 1;
          return <items.WishlistItem key={index} item={item} isLast={isLast} />;
        })}
      </div>
    );
  };

  const renderHeader = () => {
    return <components.Header title='Wishlist' burger={true} basket={true} />;
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
      {renderBottomTabBar()}
    </>
  );
};
