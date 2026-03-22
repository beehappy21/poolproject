import React, {useState} from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';

import {theme} from '../constants';

type DataItem = {
  id: number;
  name: string;
};

type Props = {
  data: DataItem[];
  style?: React.CSSProperties;
  children?: React.ReactNode;
  endMessage?: React.ReactNode;
};

export const InfiniteScrollR: React.FC<Props> = ({
  data = [],
  children,
  style,
  endMessage,
}) => {
  const [items, setItems] = useState<DataItem[]>(data?.slice(0, 20));
  const [hasMore, setHasMore] = useState(data?.length > 20);

  const fetchMoreData = () => {
    if (items.length >= data.length) {
      setHasMore(false);
      return;
    }

    setTimeout(() => {
      setItems(prevItems => [
        ...prevItems,
        ...data?.slice(prevItems.length, prevItems.length + 20),
      ]);
    }, 500);
  };

  return (
    <InfiniteScroll
      dataLength={items.length}
      next={fetchMoreData}
      hasMore={hasMore}
      loader={<h4>Loading...</h4>}
      style={style}
      endMessage={
        endMessage && (
          <p
            style={{
              textAlign: 'center',
              marginTop: 20,
              color: theme.colors.textColor,
              ...theme.fonts.Mulish_400Regular,
            }}
          >
            Yay! You have seen it all
          </p>
        )
      }
    >
      {children}
    </InfiniteScroll>
  );
};
