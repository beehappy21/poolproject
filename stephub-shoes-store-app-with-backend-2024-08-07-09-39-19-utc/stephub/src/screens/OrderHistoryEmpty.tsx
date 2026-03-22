import React, {useEffect, useState} from 'react';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {actions} from '../store/actions';
import {components} from '../components';
import {fetchLiveProducts} from '../utils/liveCatalog';

export const OrderHistoryEmpty: React.FC = () => {
  const dispatch = hooks.useAppDispatch();
  const navigate = hooks.useAppNavigate();

  const [loading, setLoading] = useState<boolean>(true);

  const [productsData, setProductsData] = useState<any>([]);

  const getData = async () => {
    setLoading(true);

    try {
      const products = await fetchLiveProducts();

      setProductsData(products);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const renderHeader = () => {
    return <components.Header goBack={true} title='Order History' />;
  };

  const renderContent = () => {
    if (loading) return <components.TabLoader />;

    return (
      <div style={{padding: '50px 20px 20px 20px'}}>
        <img
          src={require('../assets/icons/05.png')}
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
          Your order history is{'\n'}currently empty!
        </h2>
        <p
          style={{
            margin: 0,
            textAlign: 'center',
            color: theme.colors.textColor,
            lineHeight: 1.7,
            marginBottom: 30,
          }}
        >
          Once you place your first package order, it will appear here with its
          payment and shipping status.
        </p>
        <components.Button
          title='Browse Packages'
          onClick={() => {
            dispatch(actions.resetFilters());
            navigate('/Shop', {
              state: {products: productsData, title: 'Packages'},
            });
          }}
          containerStyle={{marginBottom: 10}}
        />
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
