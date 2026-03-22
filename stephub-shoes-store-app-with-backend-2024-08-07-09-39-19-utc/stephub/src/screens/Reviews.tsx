import React, {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

import {items} from '../items';
import {custom} from '../custom';
import {components} from '../components';

export const Reviews: React.FC = () => {
  const location = useLocation();
  const reviews = location.state?.reviews;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderHeader = (): JSX.Element => {
    return <components.Header goBack={true} title='Reviews' />;
  };

  const renderContent = (): JSX.Element => {
    return (
      <custom.InfiniteScrollR data={reviews} style={{margin: '20px 0 20px 0'}}>
        {reviews.map((item: any, index: number, array: any) => {
          const isLast = index === array.length - 1;
          return <items.ReviewItem isLast={isLast} item={item} />;
        })}
      </custom.InfiniteScrollR>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
