import {createSlice, PayloadAction} from '@reduxjs/toolkit';

export type ShippingAddress = {
  shippingAddressId: string;
  label: string | null;
  recipientName: string;
  phone: string;
  email: string | null;
  countryCode: string | null;
  countryName: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  subdistrictCode: string | null;
  subdistrictName: string | null;
  postalCode: string | null;
  addressLine: string;
  note: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

interface PaymentState {
  fulfillmentMethod: 'delivery' | 'branch_pickup';
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  countryCode: string;
  countryName: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  subdistrictCode: string;
  subdistrictName: string;
  postalCode: string;
  label: string;
  note: string;
  addresses: ShippingAddress[];
  selectedAddressId: string | null;
  pickupBranchName: string;
  pickupBranchNote: string;
}

const initialState: PaymentState = {
  fulfillmentMethod: 'delivery',
  name: '',
  email: '',
  phoneNumber: '',
  address: '',
  countryCode: 'TH',
  countryName: 'Thailand',
  provinceCode: '',
  provinceName: '',
  districtCode: '',
  districtName: '',
  subdistrictCode: '',
  subdistrictName: '',
  postalCode: '',
  label: '',
  note: '',
  addresses: [],
  selectedAddressId: null,
  pickupBranchName: '',
  pickupBranchNote: '',
};

export const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setFulfillmentMethod: (
      state,
      action: PayloadAction<'delivery' | 'branch_pickup'>,
    ) => {
      state.fulfillmentMethod = action.payload;
    },
    setName: (state, action: PayloadAction<string>) => {
      state.name = action.payload;
    },
    setAddress: (state, action: PayloadAction<string>) => {
      state.address = action.payload;
    },
    setEmail: (state, action: PayloadAction<string>) => {
      state.email = action.payload;
    },
    setPhoneNumber: (state, action: PayloadAction<string>) => {
      state.phoneNumber = action.payload;
    },
    setCountryCode: (state, action: PayloadAction<string>) => {
      state.countryCode = action.payload;
    },
    setCountryName: (state, action: PayloadAction<string>) => {
      state.countryName = action.payload;
    },
    setProvince: (
      state,
      action: PayloadAction<{code: string; name: string}>,
    ) => {
      state.provinceCode = action.payload.code;
      state.provinceName = action.payload.name;
      state.districtCode = '';
      state.districtName = '';
      state.subdistrictCode = '';
      state.subdistrictName = '';
      state.postalCode = '';
    },
    setDistrict: (
      state,
      action: PayloadAction<{code: string; name: string}>,
    ) => {
      state.districtCode = action.payload.code;
      state.districtName = action.payload.name;
      state.subdistrictCode = '';
      state.subdistrictName = '';
      state.postalCode = '';
    },
    setSubdistrict: (
      state,
      action: PayloadAction<{code: string; name: string; postalCode: string}>,
    ) => {
      state.subdistrictCode = action.payload.code;
      state.subdistrictName = action.payload.name;
      state.postalCode = action.payload.postalCode;
    },
    setPostalCode: (state, action: PayloadAction<string>) => {
      state.postalCode = action.payload;
    },
    setLabel: (state, action: PayloadAction<string>) => {
      state.label = action.payload;
    },
    setNote: (state, action: PayloadAction<string>) => {
      state.note = action.payload;
    },
    setPickupBranchName: (state, action: PayloadAction<string>) => {
      state.pickupBranchName = action.payload;
    },
    setPickupBranchNote: (state, action: PayloadAction<string>) => {
      state.pickupBranchNote = action.payload;
    },
    setShippingAddresses: (state, action: PayloadAction<ShippingAddress[]>) => {
      state.addresses = action.payload;
      const selectedStillExists = action.payload.some(
        address => address.shippingAddressId === state.selectedAddressId,
      );
      if (selectedStillExists) {
        return;
      }

      const defaultAddress =
        action.payload.find(address => address.isDefault) || action.payload[0];
      state.selectedAddressId = defaultAddress?.shippingAddressId || null;
    },
    addShippingAddress: (state, action: PayloadAction<ShippingAddress>) => {
      const nextAddresses = state.addresses
        .filter(
          address =>
            address.shippingAddressId !== action.payload.shippingAddressId,
        )
        .map(address => ({
          ...address,
          isDefault: action.payload.isDefault ? false : address.isDefault,
        }));

      state.addresses = [action.payload, ...nextAddresses];
      state.selectedAddressId = action.payload.shippingAddressId;
    },
    selectShippingAddress: (state, action: PayloadAction<string | null>) => {
      state.selectedAddressId = action.payload;
    },
    clearPaymentForm: state => {
      state.label = '';
      state.name = '';
      state.email = '';
      state.phoneNumber = '';
      state.address = '';
      state.countryCode = 'TH';
      state.countryName = 'Thailand';
      state.provinceCode = '';
      state.provinceName = '';
      state.districtCode = '';
      state.districtName = '';
      state.subdistrictCode = '';
      state.subdistrictName = '';
      state.postalCode = '';
      state.note = '';
      state.pickupBranchName = '';
      state.pickupBranchNote = '';
    },
  },
});

export const {
  setFulfillmentMethod,
  setName,
  setAddress,
  setEmail,
  setPhoneNumber,
  setCountryCode,
  setCountryName,
  setProvince,
  setDistrict,
  setSubdistrict,
  setPostalCode,
  setLabel,
  setNote,
  setPickupBranchName,
  setPickupBranchNote,
  setShippingAddresses,
  addShippingAddress,
  selectShippingAddress,
  clearPaymentForm,
} = paymentSlice.actions;

export default paymentSlice.reducer;
