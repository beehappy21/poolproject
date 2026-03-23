import axios from 'axios';
import React, {useCallback, useEffect, useMemo, useState} from 'react';

import {URLS} from '../config';
import {hooks} from '../hooks';
import {custom} from '../custom';
import {svg} from '../assets/svg';
import {components} from '../components';
import {actions} from '../store/actions';
import {RootState} from '../hooks';
import {
  getThaiDistrictOptions,
  getThaiSubdistrictOptions,
  thaiProvinceOptions,
} from '../utils/thaiAddress';

export const ShippingAndPaymentInfo: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const dispatch = hooks.useAppDispatch();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const payment = hooks.useAppSelector((state: RootState) => state.paymentSlice);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const selectedAddress = useMemo(() => {
    return (
      payment.addresses.find(
        address => address.shippingAddressId === payment.selectedAddressId,
      ) || null
    );
  }, [payment.addresses, payment.selectedAddressId]);
  const districtOptions = useMemo(() => {
    return payment.provinceCode
      ? getThaiDistrictOptions(payment.provinceCode)
      : [];
  }, [payment.provinceCode]);
  const subdistrictOptions = useMemo(() => {
    return payment.districtCode
      ? getThaiSubdistrictOptions(payment.districtCode)
      : [];
  }, [payment.districtCode]);
  const effectiveRecipientName = useMemo(() => {
    return (payment.name || user?.name || '').trim();
  }, [payment.name, user?.name]);
  const effectivePhoneNumber = useMemo(() => {
    return (payment.phoneNumber || user?.phone || '').trim();
  }, [payment.phoneNumber, user?.phone]);
  const effectiveEmail = useMemo(() => {
    return (payment.email || user?.email || '').trim();
  }, [payment.email, user?.email]);

  const loadAddresses = useCallback(async (): Promise<void> => {
    if (!user?.accessToken) {
      setErrorMessage('กรุณาเข้าสู่ระบบก่อนจัดการที่อยู่จัดส่ง');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const response = await axios.get(URLS.AUTH_SHIPPING_ADDRESSES, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
        withCredentials: true,
      });
      dispatch(actions.setShippingAddresses(response.data || []));
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'ไม่สามารถโหลดรายการที่อยู่จัดส่งได้',
      );
    } finally {
      setLoading(false);
    }
  }, [dispatch, user?.accessToken]);

  useEffect(() => {
    window.scrollTo(0, 0);
    void loadAddresses();
  }, [loadAddresses]);

  const renderHeader = () => {
    return <components.Header title='ข้อมูลจัดส่ง' goBack={true} />;
  };

  const renderFulfillmentMethod = (): JSX.Element => {
    return (
      <div style={{marginBottom: 24}}>
        <h4 style={{marginTop: 0, marginBottom: 12}}>วิธีรับสินค้า</h4>
        <div style={{display: 'grid', gap: 12}}>
          {[
            {
              value: 'delivery' as const,
              title: 'จัดส่งถึงที่',
              description: 'เลือกที่อยู่จัดส่งและให้ทีมงานจัดส่งตามปกติ',
            },
            {
              value: 'branch_pickup' as const,
              title: 'รับที่สาขา',
              description: 'ลูกค้าไปรับสินค้าเองที่สาขาโดยไม่ต้องใช้ที่อยู่จัดส่ง',
            },
          ].map(option => {
            const isSelected = payment.fulfillmentMethod === option.value;
            return (
              <button
                key={option.value}
                onClick={() => dispatch(actions.setFulfillmentMethod(option.value))}
                style={{
                  textAlign: 'left',
                  border: isSelected ? '2px solid #193364' : '1px solid #E8EFF4',
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: '#fff',
                }}
              >
                <div style={{fontWeight: 700, marginBottom: 6}}>{option.title}</div>
                <div style={{lineHeight: 1.6, color: '#6B7280'}}>{option.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAddressList = (): JSX.Element | null => {
    if (!payment.addresses.length) {
      return null;
    }

    return (
      <div style={{marginBottom: 28}}>
        <h4 style={{marginTop: 0, marginBottom: 12}}>ที่อยู่ที่บันทึกไว้</h4>
        <div style={{display: 'grid', gap: 12}}>
          {payment.addresses.map(address => {
            const isSelected =
              payment.selectedAddressId === address.shippingAddressId;
            return (
              <button
                key={address.shippingAddressId}
                onClick={() =>
                  dispatch(
                    actions.selectShippingAddress(address.shippingAddressId),
                  )
                }
                style={{
                  textAlign: 'left',
                  border: isSelected
                    ? '2px solid #193364'
                    : '1px solid #E8EFF4',
                  borderRadius: 16,
                  padding: 16,
                  backgroundColor: '#fff',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <strong>{address.label || 'ที่อยู่จัดส่ง'}</strong>
                  {address.isDefault ? (
                    <span style={{color: '#193364'}}>ค่าเริ่มต้น</span>
                  ) : null}
                </div>
                <div style={{lineHeight: 1.7}}>
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
                {!address.isDefault ? (
                  <span
                    onClick={async event => {
                      event.stopPropagation();
                      if (!user?.accessToken) {
                        return;
                      }

                      try {
                        await axios.post(
                          URLS.buildSetDefaultShippingAddressUrl(
                            address.shippingAddressId,
                          ),
                          {},
                          {
                            headers: {
                              Authorization: `Bearer ${user.accessToken}`,
                            },
                            withCredentials: true,
                          },
                        );
                        await loadAddresses();
                        dispatch(
                          actions.selectShippingAddress(
                            address.shippingAddressId,
                          ),
                        );
                      } catch (error: any) {
                        setErrorMessage(
                          error?.response?.data?.message ||
                            'ไม่สามารถตั้งค่าที่อยู่นี้เป็นค่าเริ่มต้นได้',
                        );
                      }
                    }}
                    style={{
                      display: 'inline-block',
                      marginTop: 12,
                      color: '#193364',
                      textDecoration: 'underline',
                    }}
                  >
                    ตั้งเป็นค่าเริ่มต้น
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderForm = (): JSX.Element => {
    return (
      <div style={{marginBottom: 24}}>
        <button
          onClick={() => setIsFormOpen(current => !current)}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #E8EFF4',
            borderRadius: 16,
            padding: '16px 18px',
            backgroundColor: '#fff',
            cursor: 'pointer',
            marginBottom: isFormOpen ? 16 : 0,
          }}
        >
          <h4 style={{margin: 0}}>เพิ่มที่อยู่ใหม่</h4>
          <span style={{fontSize: 18, color: '#193364'}}>
            {isFormOpen ? '−' : '+'}
          </span>
        </button>
        {isFormOpen ? (
          <>
            <custom.InputField
              placeholder='เช่น บ้าน, ที่ทำงาน'
              label='ชื่อที่อยู่'
              containerStyle={{marginBottom: 16}}
              onChange={event => dispatch(actions.setPaymentLabel(event.target.value))}
              value={payment.label}
            />
            <custom.InputField
              placeholder='กรอกชื่อผู้รับ'
              label='ชื่อผู้รับ'
              icon={<svg.InputCheckSvg />}
              containerStyle={{marginBottom: 16}}
              onChange={event => dispatch(actions.setPaymentName(event.target.value))}
              value={payment.name || user?.name || ''}
            />
            <custom.InputField
              placeholder='กรอกเบอร์โทรศัพท์'
              label='เบอร์โทรศัพท์'
              containerStyle={{marginBottom: 16}}
              onChange={event =>
                dispatch(actions.setPaymentPhoneNumber(event.target.value))
              }
              value={payment.phoneNumber || user?.phone || ''}
            />
            <custom.InputField
              placeholder='กรอกอีเมล'
              label='อีเมล'
              containerStyle={{marginBottom: 16}}
              onChange={event => dispatch(actions.setPaymentEmail(event.target.value))}
              value={payment.email || user?.email || ''}
            />
            <custom.InputField
              placeholder='กรอกที่อยู่จัดส่ง'
              label='ที่อยู่จัดส่ง'
              containerStyle={{marginBottom: 16}}
              onChange={event => dispatch(actions.setPaymentAddress(event.target.value))}
              value={payment.address}
            />
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', marginBottom: 6}}>ประเทศ</label>
              <select
                value={payment.countryCode}
                onChange={event => {
                  const nextCountryCode = event.target.value;
                  dispatch(actions.setPaymentCountryCode(nextCountryCode));
                  dispatch(
                    actions.setPaymentCountryName(
                      nextCountryCode === 'TH' ? 'Thailand' : nextCountryCode,
                    ),
                  );
                }}
                style={{width: '100%', height: 44, borderRadius: 12, padding: '0 12px'}}
              >
                <option value='TH'>ไทย</option>
              </select>
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', marginBottom: 6}}>จังหวัด</label>
              <select
                value={payment.provinceCode}
                onChange={event => {
                  const province = thaiProvinceOptions.find(
                    option => option.code === event.target.value,
                  );
                  dispatch(
                    actions.setPaymentProvince({
                      code: province?.code || '',
                      name: province?.nameTh || '',
                    }),
                  );
                }}
                style={{width: '100%', height: 44, borderRadius: 12, padding: '0 12px'}}
              >
                <option value=''>เลือกจังหวัด</option>
                {thaiProvinceOptions.map(province => (
                  <option key={province.code} value={province.code}>
                    {province.nameTh}
                  </option>
                ))}
              </select>
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', marginBottom: 6}}>อำเภอ / เขต</label>
              <select
                value={payment.districtCode}
                disabled={!payment.provinceCode}
                onChange={event => {
                  const district = districtOptions.find(
                    option => option.code === event.target.value,
                  );
                  dispatch(
                    actions.setPaymentDistrict({
                      code: district?.code || '',
                      name: district?.nameTh || '',
                    }),
                  );
                }}
                style={{width: '100%', height: 44, borderRadius: 12, padding: '0 12px'}}
              >
                <option value=''>เลือกอำเภอ / เขต</option>
                {districtOptions.map(district => (
                  <option key={district.code} value={district.code}>
                    {district.nameTh}
                  </option>
                ))}
              </select>
            </div>
            <div style={{marginBottom: 16}}>
              <label style={{display: 'block', marginBottom: 6}}>ตำบล / แขวง</label>
              <select
                value={payment.subdistrictCode}
                disabled={!payment.districtCode}
                onChange={event => {
                  const subdistrict = subdistrictOptions.find(
                    option => option.code === event.target.value,
                  );
                  dispatch(
                    actions.setPaymentSubdistrict({
                      code: subdistrict?.code || '',
                      name: subdistrict?.nameTh || '',
                      postalCode: subdistrict?.postalCode || '',
                    }),
                  );
                }}
                style={{width: '100%', height: 44, borderRadius: 12, padding: '0 12px'}}
              >
                <option value=''>เลือกตำบล / แขวง</option>
                {subdistrictOptions.map(subdistrict => (
                  <option key={subdistrict.code} value={subdistrict.code}>
                    {subdistrict.nameTh}
                  </option>
                ))}
              </select>
            </div>
            <custom.InputField
              placeholder='รหัสไปรษณีย์'
              label='รหัสไปรษณีย์'
              containerStyle={{marginBottom: 16}}
              onChange={event =>
                dispatch(actions.setPaymentPostalCode(event.target.value))
              }
              value={payment.postalCode}
            />
            <custom.InputField
              placeholder='เช่น ฝากไว้กับ รปภ.'
              label='หมายเหตุ'
              containerStyle={{marginBottom: 16}}
              onChange={event => dispatch(actions.setPaymentNote(event.target.value))}
              value={payment.note}
            />
            <components.Button
              title={saving ? 'กำลังบันทึก...' : 'บันทึกที่อยู่ใหม่'}
              onClick={async () => {
                if (!user?.accessToken) {
                  setErrorMessage('กรุณาเข้าสู่ระบบก่อนบันทึกที่อยู่จัดส่ง');
                  return;
                }

                if (
                  !effectiveRecipientName ||
                  !effectivePhoneNumber ||
                  !payment.address.trim() ||
                  !payment.provinceCode ||
                  !payment.districtCode ||
                  !payment.subdistrictCode ||
                  !payment.postalCode.trim()
                ) {
                  setErrorMessage('กรุณากรอกชื่อผู้รับ เบอร์โทร ที่อยู่ จังหวัด อำเภอ ตำบล และรหัสไปรษณีย์ให้ครบ');
                  return;
                }

                setSaving(true);
                setErrorMessage('');
                try {
                  const response = await axios.post(
                    URLS.AUTH_SHIPPING_ADDRESSES,
                    {
                      label: payment.label || undefined,
                      recipientName: effectiveRecipientName,
                      phone: effectivePhoneNumber,
                      email: effectiveEmail || undefined,
                      countryCode: payment.countryCode,
                      countryName: payment.countryName,
                      provinceCode: payment.provinceCode,
                      provinceName: payment.provinceName,
                      districtCode: payment.districtCode,
                      districtName: payment.districtName,
                      subdistrictCode: payment.subdistrictCode,
                      subdistrictName: payment.subdistrictName,
                      postalCode: payment.postalCode,
                      addressLine: payment.address,
                      note: payment.note || undefined,
                      isDefault: payment.addresses.length === 0,
                    },
                    {
                      headers: {
                        Authorization: `Bearer ${user.accessToken}`,
                      },
                      withCredentials: true,
                    },
                  );

                  dispatch(actions.addShippingAddress(response.data));
                  dispatch(actions.clearPaymentForm());
                  setIsFormOpen(false);
                } catch (error: any) {
                  setErrorMessage(
                    error?.response?.data?.message || 'ไม่สามารถบันทึกที่อยู่จัดส่งได้',
                  );
                } finally {
                  setSaving(false);
                }
              }}
            />
          </>
        ) : null}
      </div>
    );
  };

  const renderContent = (): JSX.Element => {
    const isBranchPickup = payment.fulfillmentMethod === 'branch_pickup';

    return (
      <div style={{padding: '40px 20px 20px 20px'}}>
        <p style={{marginTop: 0, marginBottom: 20, lineHeight: 1.7, color: '#6B7280'}}>
          สมาชิกสามารถเลือกได้ว่าจะให้จัดส่งถึงที่ หรือมารับสินค้าเองที่สาขา
        </p>
        {renderFulfillmentMethod()}
        {errorMessage ? (
          <p style={{marginTop: 0, marginBottom: 16, color: '#FF4343', lineHeight: 1.7}}>
            {errorMessage}
          </p>
        ) : null}
        {loading ? <components.Loader /> : null}
        {!loading && !isBranchPickup ? renderAddressList() : null}
        {!loading && !isBranchPickup ? renderForm() : null}
        {!loading && isBranchPickup ? (
          <div style={{marginBottom: 28}}>
            <div
              style={{
                border: '1px solid #E8EFF4',
                borderRadius: 16,
                padding: 18,
                backgroundColor: '#fff',
              }}
            >
              <custom.InputField
                placeholder='เช่น Stephub สาขาแจ้งวัฒนะ'
                label='สาขาที่จะรับสินค้า'
                containerStyle={{marginBottom: 16}}
                onChange={event =>
                  dispatch(actions.setPickupBranchName(event.target.value))
                }
                value={payment.pickupBranchName}
              />
              <custom.InputField
                placeholder='ชื่อผู้รับสินค้า'
                label='ชื่อผู้รับสินค้า'
                containerStyle={{marginBottom: 16}}
                onChange={event => dispatch(actions.setPaymentName(event.target.value))}
                value={payment.name || user?.name || ''}
              />
              <custom.InputField
                placeholder='เบอร์โทรศัพท์'
                label='เบอร์โทรศัพท์'
                containerStyle={{marginBottom: 16}}
                onChange={event =>
                  dispatch(actions.setPaymentPhoneNumber(event.target.value))
                }
                value={payment.phoneNumber || user?.phone || ''}
              />
              <custom.InputField
                placeholder='อีเมล'
                label='อีเมล'
                containerStyle={{marginBottom: 16}}
                onChange={event => dispatch(actions.setPaymentEmail(event.target.value))}
                value={payment.email || user?.email || ''}
              />
              <custom.InputField
                placeholder='เช่น รับช่วงบ่าย หรือรอติดต่อกลับ'
                label='หมายเหตุการรับสินค้า'
                containerStyle={{marginBottom: 0}}
                onChange={event =>
                  dispatch(actions.setPickupBranchNote(event.target.value))
                }
                value={payment.pickupBranchNote}
              />
            </div>
          </div>
        ) : null}
        <components.Button
          title='ไปหน้ายืนยันคำสั่งซื้อ'
          onClick={() => {
            if (isBranchPickup) {
              if (!payment.pickupBranchName.trim()) {
                setErrorMessage('กรุณาระบุสาขาที่จะรับสินค้า');
                return;
              }

              navigate('/Checkout');
              return;
            }

            if (!selectedAddress) {
              setErrorMessage('กรุณาเลือกหรือบันทึกที่อยู่จัดส่งอย่างน้อย 1 รายการ');
              return;
            }

            navigate('/Checkout');
          }}
        />
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      {renderContent()}
    </>
  );
};
