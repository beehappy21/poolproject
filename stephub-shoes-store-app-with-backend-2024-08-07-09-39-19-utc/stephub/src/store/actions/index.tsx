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
import {setFulfillmentMethod} from '../slices/paymentSlice';
import {setEmail as setPaymentEmail} from '../slices/paymentSlice';
import {setAddress as setPaymentAddress} from '../slices/paymentSlice';
import {setPhoneNumber as setPaymentPhoneNumber} from '../slices/paymentSlice';
import {setCountryCode as setPaymentCountryCode} from '../slices/paymentSlice';
import {setCountryName as setPaymentCountryName} from '../slices/paymentSlice';
import {setProvince as setPaymentProvince} from '../slices/paymentSlice';
import {setDistrict as setPaymentDistrict} from '../slices/paymentSlice';
import {setSubdistrict as setPaymentSubdistrict} from '../slices/paymentSlice';
import {setPostalCode as setPaymentPostalCode} from '../slices/paymentSlice';
import {setLabel as setPaymentLabel} from '../slices/paymentSlice';
import {setNote as setPaymentNote} from '../slices/paymentSlice';
import {setPickupBranchName} from '../slices/paymentSlice';
import {setPickupBranchNote} from '../slices/paymentSlice';
import {setShippingAddresses} from '../slices/paymentSlice';
import {addShippingAddress} from '../slices/paymentSlice';
import {selectShippingAddress} from '../slices/paymentSlice';
import {clearPaymentForm} from '../slices/paymentSlice';
import {setSelectedTags} from '../slices/filterSlice';
import {addToWishlist} from '../slices/wishlistSlice';
import {setSelectedSizes} from '../slices/filterSlice';
import {setSelectedColors} from '../slices/filterSlice';
import {setFirstLaunch} from '../slices/firstLaunchSlice';
import {removeFromWishlist} from '../slices/wishlistSlice';
import {setSelectedCategories} from '../slices/filterSlice';
import {setPhoneVerified} from '../slices/verificationSlice';
import {setEmailVerified} from '../slices/verificationSlice';

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
  setFulfillmentMethod,
  setPaymentName,
  setPaymentEmail,
  setPaymentAddress,
  setPaymentPhoneNumber,
  setPaymentCountryCode,
  setPaymentCountryName,
  setPaymentProvince,
  setPaymentDistrict,
  setPaymentSubdistrict,
  setPaymentPostalCode,
  setPaymentLabel,
  setPaymentNote,
  setPickupBranchName,
  setPickupBranchNote,
  setShippingAddresses,
  addShippingAddress,
  selectShippingAddress,
  clearPaymentForm,
  setFirstLaunch,
  setSelectedTags,
  setPhoneVerified,
  setEmailVerified,
  setSelectedSizes,
  setSelectedColors,
  removeFromWishlist,
  setSelectedCategories,
};
