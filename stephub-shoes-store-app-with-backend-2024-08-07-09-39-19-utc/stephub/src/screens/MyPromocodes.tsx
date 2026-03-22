import axios from 'axios';
import {FC, useState, useEffect} from 'react';

import {URLS} from '../config';
import {items} from '../items';
import {custom} from '../custom';
import {PromocodeType} from '../types';
import {components} from '../components';

export const MyPromocodes: FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [promocodesData, setPromocodesData] = useState<PromocodeType[]>([]);

  const getPromocodes = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await axios.get<{promocodes: PromocodeType[]}>(
        URLS.GET_PROMOCODES,
      );
      setPromocodesData(response.data.promocodes);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getPromocodes();
  }, []);

  const renderHeader = () => {
    return <components.Header title='My promocodes' goBack={true} />;
  };

  const renderContent = (): JSX.Element => {
    if (loading) return <components.Loader />;

    return (
      <div>
        <custom.InfiniteScrollR
          data={promocodesData}
          endMessage={true}
          style={{paddingTop: 20, paddingBottom: 20}}
        >
          {promocodesData?.map(
            (item: PromocodeType, index: number, array: PromocodeType[]) => {
              const isLast = index === array.length - 1;
              return (
                <items.PromocodeItem key={index} item={item} isLast={isLast} />
              );
            },
          )}
          <div
            style={{
              marginBottom: 40,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 20px',
              marginTop: 30,
            }}
          >
            <custom.InputField
              label='Enter the voucher'
              containerStyle={{width: 'calc(70% - 5px)'}}
              placeholder='Add promocode'
            />
            <components.Button
              title='+Add'
              containerStyle={{padding: 0, width: 'calc(30% - 5px)'}}
              onClick={() => {}}
            />
          </div>
        </custom.InfiniteScrollR>
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
