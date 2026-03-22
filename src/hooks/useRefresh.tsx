import {useState, useCallback} from 'react';

export const useRefresh = (refetchFunctions: Array<() => Promise<any>>) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all(refetchFunctions)
      .then(() => setRefreshing(false))
      .catch(error => {
        console.error(error);
        setRefreshing(false);
      });
  }, [refetchFunctions]);

  return {refreshing, onRefresh};
};
