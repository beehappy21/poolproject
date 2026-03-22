import {setUser} from '../slices/userSlice';
import {logOut} from '../slices/userSlice';
import {setScreen} from '../slices/tabSlice';
import {setRememberMe} from '../slices/userSlice';
import {addToCart} from '../slices/cartSlice';
import {resetCart} from '../slices/cartSlice';
import {setDiscount} from '../slices/cartSlice';
import {setPromoCode} from '../slices/cartSlice';
import {resetFilters} from '../slices/filterSlice';
import {removeFromCart} from '../slices/cartSlice';
import {setName as setPaymentName} from '../slices/paymentSlice';
import {setEmail as setPaymentEmail} from '../slices/paymentSlice';
import {setAddress as setPaymentAddress} from '../slices/paymentSlice';
import {setPhoneNumber as setPaymentPhoneNumber} from '../slices/paymentSlice';
import {setCardNumber as setPaymentCardNumber} from '../slices/paymentSlice';
import {setExpiryDate as setPaymentExpiryDate} from '../slices/paymentSlice';
import {setCvv as setPaymentCvv} from '../slices/paymentSlice';
import {setSelectedTags} from '../slices/filterSlice';
import {addToWishlist} from '../slices/wishlistSlice';
import {setSelectedSizes} from '../slices/filterSlice';
import {setSelectedColors} from '../slices/filterSlice';
import {setFirstLaunch} from '../slices/firstLaunchSlice';
import {removeFromWishlist} from '../slices/wishlistSlice';
import {setSelectedCategories} from '../slices/filterSlice';
import {setPhoneVerified} from '../slices/verificationSlice';
import {setEmailVerified} from '../slices/verificationSlice';
import {setCardHolderName as setPaymentCardHolderName} from '../slices/paymentSlice';

export const actions = {
  setUser,
  logOut,
  setScreen,
  setRememberMe,
  addToCart,
  resetCart,
  setDiscount,
  resetFilters,
  setPromoCode,
  addToWishlist,
  removeFromCart,
  setPaymentName,
  setPaymentEmail,
  setPaymentAddress,
  setPaymentPhoneNumber,
  setPaymentCardNumber,
  setPaymentExpiryDate,
  setPaymentCvv,
  setPaymentCardHolderName,
  setFirstLaunch,
  setSelectedTags,
  setPhoneVerified,
  setEmailVerified,
  setSelectedSizes,
  setSelectedColors,
  removeFromWishlist,
  setSelectedCategories,
};
