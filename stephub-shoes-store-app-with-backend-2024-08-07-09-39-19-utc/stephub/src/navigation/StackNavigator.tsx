import React from 'react';
import {RouterProvider, createBrowserRouter} from 'react-router-dom';

import {screens} from '../screens';
import {AppShell} from './AppShell';
import {RequireAuth} from './RequireAuth';
import {TabNavigator} from './TabNavigator';

const stack = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {index: true, element: <screens.SignIn />},
      {
        path: 'TabNavigator',
        element: (
          <RequireAuth>
            <TabNavigator />
          </RequireAuth>
        ),
      },
      {
        path: 'EditProfile',
        element: (
          <RequireAuth>
            <screens.EditProfile />
          </RequireAuth>
        ),
      },
      {
        path: 'Product',
        element: (
          <RequireAuth>
            <screens.Product />
          </RequireAuth>
        ),
      },
      {
        path: 'Shop',
        element: (
          <RequireAuth>
            <screens.Shop />
          </RequireAuth>
        ),
      },
      {
        path: 'Reviews',
        element: (
          <RequireAuth>
            <screens.Reviews />
          </RequireAuth>
        ),
      },
      {
        path: 'Description',
        element: (
          <RequireAuth>
            <screens.Description />
          </RequireAuth>
        ),
      },
      {
        path: 'OrderHistory',
        element: (
          <RequireAuth>
            <screens.OrderHistory />
          </RequireAuth>
        ),
      },
      {
        path: 'TeamMember',
        element: (
          <RequireAuth>
            <screens.TeamMember />
          </RequireAuth>
        ),
      },
      {
        path: 'Commission',
        element: (
          <RequireAuth>
            <screens.Commission />
          </RequireAuth>
        ),
      },
      {
        path: 'Firm',
        element: (
          <RequireAuth>
            <screens.Firm />
          </RequireAuth>
        ),
      },
      {
        path: 'TransferSW',
        element: (
          <RequireAuth>
            <screens.TransferSW />
          </RequireAuth>
        ),
      },
      {
        path: 'TopupWallet',
        element: (
          <RequireAuth>
            <screens.TopupWallet />
          </RequireAuth>
        ),
      },
      {
        path: 'WithdrawSW',
        element: (
          <RequireAuth>
            <screens.WithdrawSW />
          </RequireAuth>
        ),
      },
      {
        path: 'Kyc',
        element: (
          <RequireAuth>
            <screens.Kyc />
          </RequireAuth>
        ),
      },
      {
        path: 'Checkout',
        element: (
          <RequireAuth>
            <screens.Checkout />
          </RequireAuth>
        ),
      },
      {
        path: 'OrderSuccessful',
        element: (
          <RequireAuth>
            <screens.OrderSuccessful />
          </RequireAuth>
        ),
      },
      {
        path: 'OrderFailed',
        element: (
          <RequireAuth>
            <screens.OrderFailed />
          </RequireAuth>
        ),
      },
      {
        path: 'MyPromocodes',
        element: (
          <RequireAuth>
            <screens.MyPromocodes />
          </RequireAuth>
        ),
      },
      {
        path: 'SignOut',
        element: (
          <RequireAuth>
            <screens.SignOut />
          </RequireAuth>
        ),
      },
      {path: 'SendPhoneOtp', element: <screens.SendPhoneOtp />},
      {path: 'VerifyEmail', element: <screens.VerifyEmail />},
      {path: 'VerifyPhone', element: <screens.VerifyPhone />},
      {path: 'SendEmailOtp', element: <screens.SendEmailOtp />},
      {
        path: 'OrderHistoryEmpty',
        element: (
          <RequireAuth>
            <screens.OrderHistoryEmpty />
          </RequireAuth>
        ),
      },
      {path: 'EmailVerified', element: <screens.EmailVerified />},
      {path: 'PhoneVerified', element: <screens.PhoneVerified />},
      {path: 'SignUp', element: <screens.SignUp />},
      {path: 'line/liff/signin', element: <screens.LineLiffSignIn />},
      {path: 'line/liff/signin/share', element: <screens.LineRichMenuShare />},
      {path: 'CompleteRegistration', element: <screens.CompleteRegistration />},
      {path: 'SignUpAccountCreated', element: <screens.SignUpAccountCreated />},
      {path: 'ForgotPassword', element: <screens.ForgotPassword />},
      {path: 'NewPassword', element: <screens.NewPassword />},
      {
        path: 'ForgotPasswordSentEmail',
        element: <screens.ForgotPasswordSentEmail />,
      },
      {
        path: 'DeleteAccount',
        element: (
          <RequireAuth>
            <screens.DeleteAccount />
          </RequireAuth>
        ),
      },
      {
        path: 'ChangePassword',
        element: (
          <RequireAuth>
            <screens.ChangePassword />
          </RequireAuth>
        ),
      },
      {
        path: 'ShippingAndPaymentInfo',
        element: (
          <RequireAuth>
            <screens.ShippingAndPaymentInfo />
          </RequireAuth>
        ),
      },
      {
        path: 'InfoSaved',
        element: (
          <RequireAuth>
            <screens.InfoSaved />
          </RequireAuth>
        ),
      },
      {
        path: 'LeaveAReview',
        element: (
          <RequireAuth>
            <screens.LeaveAReview />
          </RequireAuth>
        ),
      },
      {path: 'MyPromocodesEmpty', element: <screens.MyPromocodesEmpty />},
      {
        path: 'Filter',
        element: (
          <RequireAuth>
            <screens.Filter />
          </RequireAuth>
        ),
      },
    ],
  },
]);

export const StackNavigator: React.FC = () => {
  return <RouterProvider router={stack} />;
};
