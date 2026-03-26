import React, {useEffect, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {animated, useSpring} from '@react-spring/web';

import {components} from '../components';
import {custom} from '../custom';
import {svg} from '../assets/svg';
import {theme} from '../constants';
import {items as ShopItem} from '../items';
import {hooks, RootState} from '../hooks';

const sortingBy = [
  {id: 1, title: 'Featured'},
  {id: 2, title: 'Popular'},
  {id: 3, title: 'Newest'},
  {id: 4, title: 'Price: low to high'},
  {id: 5, title: 'Price: high to low'},
];

export const Shop: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const location = useLocation();
  const products = location.state?.products || [];

  const [sort, setSort] = useState(sortingBy[0]);
  const [modalIsOpen, setIsOpen] = useState(false);

  const backdropAnimation = useSpring({
    opacity: modalIsOpen ? 1 : 0,
    display: modalIsOpen ? 'flex' : 'none',
  });

  useEffect(() => {
    if (modalIsOpen) {
      document.body.style.overflow = 'hidden';
    }

    if (!modalIsOpen) {
      document.body.style.overflow = 'auto';
    }
  }, [modalIsOpen]);

  const {selectedColors, selectedSizes, selectedCategories, selectedTags} =
    hooks.useAppSelector((state: RootState) => state.filterSlice);

  const filteredProducts = products.filter((product: any) => {
    const sizeMatch =
      selectedSizes.length === 0
        ? true
        : selectedSizes.some(size => product.sizes.includes(size));

    const colorMatch =
      selectedColors.length === 0
        ? true
        : selectedColors.some(selectedColor =>
            product.colors.some(
              (productColor: any) => productColor.name === selectedColor,
            ),
          );

    const tagMatch =
      selectedTags.length === 0
        ? true
        : selectedTags.some(tag => product.tags.includes(tag));

    const statusMatch =
      selectedCategories.length === 0
        ? true
        : (product.isNew && selectedCategories.includes('new')) ||
          (product.isTop && selectedCategories.includes('top')) ||
          (product.oldPrice && selectedCategories.includes('sale'));

    return colorMatch && statusMatch && tagMatch && sizeMatch;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sort.title) {
      case 'Price: low to high':
        return a.price - b.price;
      case 'Price: high to low':
        return b.price - a.price;
      case 'Newest':
        return a.isNew === b.isNew ? 0 : a.isNew ? -1 : 1;
      case 'Popular':
        return a.isTop === b.isTop ? 0 : a.isTop ? -1 : 1;
      case 'Featured':
        return a.isFeatured === b.isFeatured ? 0 : a.isFeatured ? -1 : 1;
      case 'Sale':
        return a.oldPrice === b.oldPrice ? 0 : a.oldPrice ? -1 : 1;
      default:
        return 0;
    }
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const renderHeader = () => {
    return (
      <header
        style={{
          top: 0,
          position: 'sticky',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: theme.colors.white,
          zIndex: 4,
        }}
      >
        <components.Header goBack={true} line={true} />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            padding: '12px 20px 19px 20px',
          }}
        >
          <button
            onClick={() => {
              navigate('/Filter');
            }}
            aria-label='Open filters'
          >
            <svg.FiltersSvg />
          </button>
          <button
            onClick={() => {
              setIsOpen(true);
            }}
            aria-label='Open sorting options'
          >
            <svg.SortingBySvg />
          </button>
        </div>
      </header>
    );
  };

  const renderContent = () => {
    return (
      <div>
        <custom.InfiniteScrollR
          data={products}
          endMessage={true}
          style={{paddingBottom: 20}}
        >
          {sortedProducts.length === 0 ? (
            <div style={{paddingLeft: 20, paddingRight: 20, paddingBottom: 20}}>
              <div
                style={{
                  backgroundColor: theme.colors.ghostWhite,
                  borderRadius: 16,
                  padding: 20,
                  color: theme.colors.textColor,
                  lineHeight: 1.7,
                }}
              >
                ไม่พบสินค้าที่ตรงกับตัวกรองที่เลือก
              </div>
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              paddingLeft: 20,
              paddingRight: 20,
            }}
          >
            {sortedProducts.map((reviewItem: any, index: any, array: any) => {
              const isLast = index === array.length - 1;
              return (
                <ShopItem.ProductCard
                  key={reviewItem.id}
                  isLast={isLast}
                  item={reviewItem}
                  version={2}
                />
              );
            })}
          </div>
        </custom.InfiniteScrollR>
      </div>
    );
  };

  const renderModal = (): JSX.Element => {
    return (
      <animated.div
        className='container'
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(25, 51, 100, 0.6)',
          position: 'fixed',
          inset: 0,
          zIndex: 22,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          ...backdropAnimation,
        }}
        onClick={() => setIsOpen(false)}
      >
        <div
          style={{
            width: 'calc(100% - 80px)',
            backgroundColor: 'white',
            marginLeft: 20,
            marginRight: 20,
            borderRadius: 5,
            paddingTop: 10,
            paddingLeft: 20,
          }}
        >
          {sortingBy.map(item => {
            return (
              <button
                style={{
                  width: '100%',
                  margin: 0,
                  marginLeft: 0,
                  paddingRight: 20,
                  borderBottom: '1px solid #E5E5E5',
                  paddingBottom: 15,
                  paddingTop: 10,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setSort(item);
                  setIsOpen(false);
                }}
              >
                <span
                  style={{
                    ...theme.fonts.Mulish_400Regular,
                    fontSize: 16,
                    color: theme.colors.textColor,
                    lineHeight: 1.7,
                  }}
                >
                  {item.title}
                </span>

                <div
                  style={{
                    width: 17,
                    height: 17,
                    border: '3px solid #E8EFF4',
                    borderRadius: 50,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {sort.id === item.id && (
                    <div
                      style={{
                        width: 9,
                        height: 9,
                        backgroundColor: theme.colors.mainColor,
                        borderRadius: 50,
                      }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </animated.div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
      {renderModal()}
    </>
  );
};
