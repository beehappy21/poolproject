import axios from 'axios';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {URLS} from '../config';
import {hooks} from '../hooks';
import {custom} from '../custom';
import {theme} from '../constants';
import {components} from '../components';
import {actions} from '../store/actions';
import {
  getThaiDistrictOptions,
  getThaiSubdistrictOptions,
  thaiProvinceOptions,
} from '../utils/thaiAddress';

type ShippingAddress = {
  shippingAddressId: string;
  label?: string | null;
  recipientName: string;
  phone: string;
  email?: string | null;
  countryCode?: string | null;
  countryName?: string | null;
  provinceCode?: string | null;
  addressLine: string;
  note?: string | null;
  isDefault: boolean;
  districtCode?: string | null;
  subdistrictCode?: string | null;
  provinceName?: string | null;
  districtName?: string | null;
  subdistrictName?: string | null;
  postalCode?: string | null;
};

const splitName = (fullName?: string | null) => {
  const normalizedName = fullName?.trim() || '';

  if (!normalizedName) {
    return {firstName: '', lastName: ''};
  }

  const [firstName, ...rest] = normalizedName.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(' '),
  };
};

const renderSelectField = ({
  label,
  value,
  onChange,
  children,
  disabled = false,
  marginBottom = 16,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  marginBottom?: number;
}) => {
  return (
    <div
      style={{
        height: 50,
        paddingLeft: 20,
        paddingRight: 16,
        borderRadius: 12,
        position: 'relative',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#e8eff4',
        display: 'flex',
        alignItems: 'center',
        backgroundColor: disabled ? '#F8FAFC' : '#fff',
        marginBottom,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -8,
          left: 20,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: 12,
          backgroundColor: '#fff',
          fontSize: 12,
          color: theme.colors.textColor,
          textTransform: 'uppercase',
          fontFamily: 'Mulish-SemiBold',
        }}
      >
        {label}
      </div>
      <select
        value={value}
        disabled={disabled}
        onChange={onChange}
        style={{
          width: '100%',
          height: '100%',
          padding: 0,
          margin: 0,
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          fontSize: 16,
          color: disabled ? '#94A3B8' : theme.colors.mainColor,
          cursor: disabled ? 'not-allowed' : 'pointer',
          appearance: 'auto',
          WebkitAppearance: 'menulist',
          fontFamily: 'Mulish-Regular',
        }}
      >
        {children}
      </select>
    </div>
  );
};

export const EditProfile: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const dispatch = hooks.useAppDispatch();
  const user = hooks.useAppSelector(state => state.userSlice.user);
  const initialName = useMemo(() => splitName(user?.name), [user?.name]);
  const [firstName, setFirstName] = useState(initialName.firstName);
  const [lastName, setLastName] = useState(initialName.lastName);
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressNote, setAddressNote] = useState('');
  const [countryCode, setCountryCode] = useState<'TH' | 'OTHER'>('TH');
  const [countryName, setCountryName] = useState('Thailand');
  const [provinceCode, setProvinceCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [subdistrictCode, setSubdistrictCode] = useState('');
  const [subdistrictName, setSubdistrictName] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const accessToken = user?.accessToken || '';
  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
  const districtOptions = useMemo(() => {
    return countryCode === 'TH' && provinceCode
      ? getThaiDistrictOptions(provinceCode)
      : [];
  }, [countryCode, provinceCode]);
  const subdistrictOptions = useMemo(() => {
    return countryCode === 'TH' && districtCode
      ? getThaiSubdistrictOptions(districtCode)
      : [];
  }, [countryCode, districtCode]);

  const loadAddresses = useCallback(async () => {
    if (!accessToken) {
      return;
    }

    setLoadingAddresses(true);
    try {
      const response = await axios.get<ShippingAddress[]>(URLS.AUTH_SHIPPING_ADDRESSES, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        withCredentials: true,
      });
      setAddresses(response.data || []);
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'ไม่สามารถโหลดที่อยู่จัดส่งได้',
      );
    } finally {
      setLoadingAddresses(false);
    }
  }, [accessToken]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setFirstName(initialName.firstName);
    setLastName(initialName.lastName);
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [initialName.firstName, initialName.lastName, user?.email, user?.phone]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const handleSaveProfile = async () => {
    if (!accessToken) {
      setErrorMessage('กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูลสมาชิก');
      return;
    }

    if (!fullName && !email.trim() && !phone.trim()) {
      setErrorMessage('กรุณากรอกชื่อ อีเมล หรือเบอร์โทรอย่างน้อย 1 รายการ');
      return;
    }

    setSavingProfile(true);
    setErrorMessage('');
    setMessage('');

    try {
      await axios.post(
        URLS.AUTH_PROFILE,
        {
          name: fullName || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        },
      );

      dispatch(
        actions.setUser({
          ...user,
          name: fullName || user?.name,
          email: email.trim(),
          phone: phone.trim(),
        }),
      );
      setMessage('บันทึกข้อมูลสมาชิกเรียบร้อยแล้ว');
      window.setTimeout(() => setMessage(''), 2000);
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลสมาชิกได้',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateAddress = async () => {
    if (!accessToken) {
      setErrorMessage('กรุณาเข้าสู่ระบบก่อนเพิ่มที่อยู่จัดส่ง');
      return;
    }

    if (
      !fullName ||
      !phone.trim() ||
      !addressLine.trim() ||
      !provinceName.trim() ||
      !districtName.trim() ||
      !subdistrictName.trim() ||
      !postalCode.trim()
    ) {
      setErrorMessage(
        'กรุณากรอกชื่อ นามสกุล เบอร์โทร ที่อยู่ จังหวัด อำเภอ ตำบล และรหัสไปรษณีย์ให้ครบ',
      );
      return;
    }

    setSavingAddress(true);
    setErrorMessage('');
    setMessage('');

    try {
      const response = await axios.post<ShippingAddress>(
        URLS.AUTH_SHIPPING_ADDRESSES,
        {
          label: addressLabel.trim() || undefined,
          recipientName: fullName,
          phone: phone.trim(),
          email: email.trim() || undefined,
          countryCode,
          countryName,
          provinceCode: provinceCode || undefined,
          provinceName: provinceName.trim(),
          districtCode: districtCode || undefined,
          districtName: districtName.trim(),
          subdistrictCode: subdistrictCode || undefined,
          subdistrictName: subdistrictName.trim(),
          postalCode: postalCode.trim(),
          addressLine: addressLine.trim(),
          note: addressNote.trim() || undefined,
          isDefault: addresses.length === 0,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          withCredentials: true,
        },
      );

      setAddresses(current => [response.data, ...current]);
      setAddressLabel('');
      setAddressLine('');
      setAddressNote('');
      setCountryCode('TH');
      setCountryName('Thailand');
      setProvinceCode('');
      setProvinceName('');
      setDistrictCode('');
      setDistrictName('');
      setSubdistrictCode('');
      setSubdistrictName('');
      setPostalCode('');
      setShowAddressForm(false);
      setMessage('เพิ่มที่อยู่จัดส่งเรียบร้อยแล้ว');
      window.setTimeout(() => setMessage(''), 2000);
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'ไม่สามารถเพิ่มที่อยู่จัดส่งได้',
      );
    } finally {
      setSavingAddress(false);
    }
  };

  const renderHeader = () => {
    return <components.Header goBack={true} title='Personal info' />;
  };

  return (
    <>
      {renderHeader()}
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 40,
          paddingBottom: 32,
        }}
      >
        <div
          style={{
            border: '1px solid #E8EFF4',
            borderRadius: 20,
            backgroundColor: '#fff',
            padding: 18,
            marginBottom: 24,
          }}
        >
          <div style={{marginBottom: 14, color: '#64748B', fontSize: 13}}>
            รหัสสมาชิก: {user?.memberCode || '-'}
          </div>
          <custom.InputField
            label='ชื่อ'
            containerStyle={{marginBottom: 16}}
            placeholder='ชื่อ'
            value={firstName}
            onChange={event => setFirstName(event.target.value)}
          />
          <custom.InputField
            label='นามสกุล'
            containerStyle={{marginBottom: 16}}
            placeholder='นามสกุล'
            value={lastName}
            onChange={event => setLastName(event.target.value)}
          />
          <custom.InputField
            label='อีเมล'
            containerStyle={{marginBottom: 16}}
            placeholder='อีเมล'
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
          <custom.InputField
            label='เบอร์โทร'
            containerStyle={{marginBottom: 16}}
            placeholder='เบอร์โทร'
            value={phone}
            onChange={event => setPhone(event.target.value)}
          />
          <components.Button
            title={savingProfile ? 'กำลังบันทึก...' : 'บันทึกข้อมูลสมาชิก'}
            onClick={handleSaveProfile}
          />
        </div>

        <div
          style={{
            border: '1px solid #E8EFF4',
            borderRadius: 20,
            backgroundColor: '#fff',
            padding: 18,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setShowAddressForm(current => !current)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
              border: 'none',
              backgroundColor: 'transparent',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: 17,
                color: theme.colors.mainColor,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              เพิ่มที่อยู่จัดส่ง
            </span>
            <span
              style={{
                color: theme.colors.mainColor,
                fontSize: 18,
                lineHeight: 1,
                ...theme.fonts.Mulish_700Bold,
              }}
            >
              {showAddressForm ? '−' : '+'}
            </span>
          </button>

          {showAddressForm ? (
            <div
              style={{
                borderTop: '1px solid #EEF2F7',
                paddingTop: 16,
                marginBottom: 20,
              }}
            >
              <custom.InputField
                label='ชื่อที่อยู่'
                containerStyle={{marginBottom: 16}}
                placeholder='เช่น บ้าน, ที่ทำงาน'
                value={addressLabel}
                onChange={event => setAddressLabel(event.target.value)}
              />
              <custom.InputField
                label='ที่อยู่จัดส่ง'
                containerStyle={{
                  marginBottom: 16,
                  height: 72,
                  alignItems: 'flex-start',
                  paddingTop: 20,
                }}
                placeholder='กรอกที่อยู่จัดส่ง'
                value={addressLine}
                onChange={event => setAddressLine(event.target.value)}
              />
              {renderSelectField({
                label: 'ประเทศ',
                value: countryCode,
                onChange: event => {
                  const nextCountryCode = event.target.value === 'TH' ? 'TH' : 'OTHER';
                  setCountryCode(nextCountryCode);
                  setCountryName(
                    nextCountryCode === 'TH' ? 'Thailand' : 'Other country',
                  );
                  setProvinceCode('');
                  setProvinceName('');
                  setDistrictCode('');
                  setDistrictName('');
                  setSubdistrictCode('');
                  setSubdistrictName('');
                  setPostalCode('');
                },
                children: (
                  <>
                  <option value='TH'>ไทย</option>
                  <option value='OTHER'>ต่างประเทศ</option>
                  </>
                ),
              })}
              {countryCode === 'TH' ? (
                <>
                  {renderSelectField({
                    label: 'จังหวัด',
                    value: provinceCode,
                    onChange: event => {
                      const province = thaiProvinceOptions.find(
                        option => option.code === event.target.value,
                      );
                      setProvinceCode(province?.code || '');
                      setProvinceName(province?.nameTh || '');
                      setDistrictCode('');
                      setDistrictName('');
                      setSubdistrictCode('');
                      setSubdistrictName('');
                      setPostalCode('');
                    },
                    children: (
                      <>
                      <option value=''>เลือกจังหวัด</option>
                      {thaiProvinceOptions.map(province => (
                        <option key={province.code} value={province.code}>
                          {province.nameTh}
                        </option>
                      ))}
                      </>
                    ),
                  })}
                  {renderSelectField({
                    label: 'อำเภอ / เขต',
                    value: districtCode,
                    disabled: !provinceCode,
                    onChange: event => {
                      const district = districtOptions.find(
                        option => option.code === event.target.value,
                      );
                      setDistrictCode(district?.code || '');
                      setDistrictName(district?.nameTh || '');
                      setSubdistrictCode('');
                      setSubdistrictName('');
                      setPostalCode('');
                    },
                    children: (
                      <>
                      <option value=''>เลือกอำเภอ / เขต</option>
                      {districtOptions.map(district => (
                        <option key={district.code} value={district.code}>
                          {district.nameTh}
                        </option>
                      ))}
                      </>
                    ),
                  })}
                  {renderSelectField({
                    label: 'ตำบล / แขวง',
                    value: subdistrictCode,
                    disabled: !districtCode,
                    onChange: event => {
                      const subdistrict = subdistrictOptions.find(
                        option => option.code === event.target.value,
                      );
                      setSubdistrictCode(subdistrict?.code || '');
                      setSubdistrictName(subdistrict?.nameTh || '');
                      setPostalCode(subdistrict?.postalCode || '');
                    },
                    children: (
                      <>
                      <option value=''>เลือกตำบล / แขวง</option>
                      {subdistrictOptions.map(subdistrict => (
                        <option key={subdistrict.code} value={subdistrict.code}>
                          {subdistrict.nameTh}
                        </option>
                      ))}
                      </>
                    ),
                  })}
                </>
              ) : (
                <>
                  <custom.InputField
                    label='จังหวัด / รัฐ'
                    containerStyle={{marginBottom: 16}}
                    placeholder='กรอกจังหวัด / รัฐ'
                    value={provinceName}
                    onChange={event => setProvinceName(event.target.value)}
                  />
                  <custom.InputField
                    label='อำเภอ / เมือง'
                    containerStyle={{marginBottom: 16}}
                    placeholder='กรอกอำเภอ / เมือง'
                    value={districtName}
                    onChange={event => setDistrictName(event.target.value)}
                  />
                  <custom.InputField
                    label='ตำบล / เขต'
                    containerStyle={{marginBottom: 16}}
                    placeholder='กรอกตำบล / เขต'
                    value={subdistrictName}
                    onChange={event => setSubdistrictName(event.target.value)}
                  />
                </>
              )}
              <custom.InputField
                label='รหัสไปรษณีย์'
                containerStyle={{marginBottom: 16}}
                placeholder='รหัสไปรษณีย์'
                value={postalCode}
                onChange={event => setPostalCode(event.target.value)}
              />
              <custom.InputField
                label='หมายเหตุ'
                containerStyle={{marginBottom: 16}}
                placeholder='เช่น ฝากไว้กับ รปภ.'
                value={addressNote}
                onChange={event => setAddressNote(event.target.value)}
              />
              <components.Button
                title={savingAddress ? 'กำลังเพิ่ม...' : 'บันทึกที่อยู่จัดส่ง'}
                onClick={handleCreateAddress}
              />
            </div>
          ) : null}

          {loadingAddresses ? (
            <components.Loader />
          ) : addresses.length > 0 ? (
            <div style={{display: 'grid', gap: 12}}>
              {addresses.map(address => (
                <div
                  key={address.shippingAddressId}
                  style={{
                    border: '1px solid #E8EFF4',
                    borderRadius: 16,
                    padding: 16,
                    backgroundColor: address.isDefault ? '#F8FAFC' : '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <strong style={{color: theme.colors.mainColor}}>
                      {address.label || 'ที่อยู่จัดส่ง'}
                    </strong>
                    {address.isDefault ? (
                      <span style={{fontSize: 12, color: '#0F766E'}}>ค่าเริ่มต้น</span>
                    ) : null}
                  </div>
                  <div style={{lineHeight: 1.7, color: theme.colors.textColor}}>
                    <div>{address.recipientName}</div>
                    <div>{[address.phone, address.email].filter(Boolean).join(' • ')}</div>
                    <div>{address.addressLine}</div>
                    <div>
                      {[
                        address.subdistrictName,
                        address.districtName,
                        address.provinceName,
                        address.postalCode,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    </div>
                    {address.note ? <div>หมายเหตุ: {address.note}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <p
            style={{
              marginTop: 0,
              marginBottom: 16,
              color: theme.colors.coralRed,
              lineHeight: 1.7,
            }}
          >
            {errorMessage}
          </p>
        ) : null}
        {message ? (
          <p
            style={{
              marginTop: 0,
              marginBottom: 16,
              color: '#0F766E',
              lineHeight: 1.7,
            }}
          >
            {message}
          </p>
        ) : null}

        <button
          onClick={() => navigate(-1)}
          style={{
            width: '100%',
            padding: '14px 18px',
            borderRadius: 14,
            border: '1px solid #D7E2F2',
            backgroundColor: '#fff',
            color: theme.colors.mainColor,
            fontSize: 16,
          }}
        >
          กลับหน้าก่อนหน้า
        </button>
      </div>
    </>
  );
};
