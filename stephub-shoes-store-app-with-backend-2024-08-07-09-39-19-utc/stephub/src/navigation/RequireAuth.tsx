import axios from 'axios';
import React, {useEffect} from 'react';
import {Navigate, useLocation} from 'react-router-dom';

import {URLS} from '../config';
import {hooks} from '../hooks';
import {RootState} from '../store';
import {actions} from '../store/actions';

type Props = {
  children: JSX.Element;
};

const AUTH_VERIFY_TIMEOUT_MS = 8000;

const isPublicWapHostname = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();

  return (
    hostname === 'wap.blifehealthy.com' ||
    hostname === 'www.blifehealthy.com' ||
    hostname === 'blifehealthy.com'
  );
};

const isPublicTouchRuntime = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(
    window.navigator.userAgent || '',
  );

  return Boolean(coarsePointer || maxTouchPoints > 0 || mobileUserAgent);
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
  const location = useLocation();
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
          isPublicWapHostname() &&
          isPublicTouchRuntime() &&
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
    return (
      <Navigate
        to='/SignIn'
        replace
        state={{
          returnTo: `${location.pathname}${location.search}${location.hash}`,
          loginMessage: 'กรุณาเข้าสู่ระบบก่อนใช้งานหน้านี้',
        }}
      />
    );
  }

  return children;
};
