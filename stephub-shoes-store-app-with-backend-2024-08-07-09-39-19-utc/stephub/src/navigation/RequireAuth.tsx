import axios from 'axios';
import React, {useEffect} from 'react';
import {Navigate} from 'react-router-dom';

import {URLS} from '../config';
import {hooks} from '../hooks';
import {RootState} from '../store';
import {actions} from '../store/actions';

type Props = {
  children: JSX.Element;
};

const AUTH_VERIFY_TIMEOUT_MS = 8000;

const isPublicIosRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.location.hostname.toLowerCase() === 'wap.blifehealthy.com' &&
    /iPad|iPhone|iPod/.test(window.navigator.userAgent || '')
  );
};

const shouldKeepSessionOnVerifyFailure = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;

  if (status === 401 || status === 403) {
    return false;
  }

  return true;
};

export const RequireAuth: React.FC<Props> = ({children}) => {
  const dispatch = hooks.useAppDispatch();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const accessToken = user?.accessToken?.trim() || '';

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      if (!accessToken) {
        return;
      }

      try {
        const response = await axios.get(URLS.AUTH_ME, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
          timeout: AUTH_VERIFY_TIMEOUT_MS,
        });

        if (cancelled) {
          return;
        }

        dispatch(
          actions.setUser({
            ...response.data?.user,
            accessToken,
          }),
        );
      } catch (error) {
        console.error('Unable to verify persisted auth session.', error);

        if (cancelled) {
          return;
        }

        if (
          isPublicIosRuntime() &&
          shouldKeepSessionOnVerifyFailure(error)
        ) {
          return;
        }

        dispatch(actions.logOut());
        dispatch(actions.setScreen('Home'));
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch]);

  if (!accessToken) {
    return <Navigate to='/' replace />;
  }

  return children;
};
