import axios from 'axios';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {URLS} from '../config';
import {hooks} from '../hooks';
import {custom} from '../custom';
import {theme} from '../constants';
import {components} from '../components';
import {actions} from '../store/actions';

type ShippingAddress = {
  shippingAddressId: string;
  label?: string | null;
  recipientName: string;
  phone: string;
  email?: string | null;
  addressLine: string;
  note?: string | null;
  isDefault: boolean;
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

  const accessToken = user?.accessToken || '';
  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();

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

    if (!fullName || !phone.trim() || !addressLine.trim()) {
      setErrorMessage('กรุณากรอกชื่อ นามสกุล เบอร์โทร และที่อยู่จัดส่งให้ครบ');
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
          countryCode: 'TH',
          countryName: 'Thailand',
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h3
                style={{
                  margin: '0 0 6px 0',
                  fontSize: 20,
                  color: theme.colors.mainColor,
                  ...theme.fonts.Mulish_700Bold,
                }}
              >
                ที่อยู่จัดส่ง
              </h3>
              <p style={{margin: 0, lineHeight: 1.6, color: theme.colors.textColor}}>
                เพิ่มที่อยู่จัดส่งได้หลายรายการจากหน้า Personal info นี้
              </p>
            </div>
            <button
              onClick={() => setShowAddressForm(current => !current)}
              style={{
                border: '1px solid #D7E2F2',
                backgroundColor: '#F8FAFC',
                color: theme.colors.mainColor,
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 14,
              }}
            >
              {showAddressForm ? 'ปิดฟอร์ม' : 'เพิ่มที่อยู่'}
            </button>
          </div>

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
          ) : (
            <p style={{margin: 0, lineHeight: 1.7, color: theme.colors.textColor}}>
              ยังไม่มีที่อยู่จัดส่ง สามารถเพิ่มรายการแรกได้จากปุ่มด้านบน
            </p>
          )}
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
