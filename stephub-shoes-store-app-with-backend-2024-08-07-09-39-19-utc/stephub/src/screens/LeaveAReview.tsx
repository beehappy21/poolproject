import axios from 'axios';
import React, {useState} from 'react';
import {useLocation} from 'react-router-dom';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {components} from '../components';
import {URLS} from '../config';
import {RootState} from '../store';
import {ProductType} from '../types';

type LeaveReviewLocationState = {
  product?: ProductType;
  productDetailId?: string;
  productName?: string;
};

export const LeaveAReview: React.FC = () => {
  const navigate = hooks.useAppNavigate();
  const location = useLocation();
  const user = hooks.useAppSelector((state: RootState) => state.userSlice.user);
  const reviewState = (location.state || {}) as LeaveReviewLocationState;

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');

  const productDetailId = String(reviewState.productDetailId || '').trim();
  const productName = reviewState.productName?.trim() || 'สินค้านี้';

  const showStatus = (message: string, tone: 'success' | 'error') => {
    setStatusMessage(message);
    setStatusTone(tone);
  };

  const handleSubmit = async () => {
    if (!productDetailId) {
      showStatus('ไม่พบข้อมูลสินค้าที่ต้องการรีวิว', 'error');
      return;
    }

    if (!user?.accessToken) {
      showStatus('กรุณาเข้าสู่ระบบก่อนส่งรีวิว', 'error');
      return;
    }

    if (rating < 1 || rating > 5) {
      showStatus('กรุณาเลือกระดับดาวอย่างน้อย 1 ดาว', 'error');
      return;
    }

    setSubmitting(true);
    setStatusMessage('');

    try {
      await axios.post(
        URLS.buildAuthProductReviewsUrl(productDetailId),
        {
          rating,
          comment: comment.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
          withCredentials: true,
        },
      );

      showStatus('ส่งรีวิวเรียบร้อยแล้ว', 'success');

      window.setTimeout(() => {
        if (reviewState.product) {
          navigate('/Product', {
            replace: true,
            state: {item: reviewState.product},
          });
          return;
        }

        navigate(-1);
      }, 600);
    } catch (error: any) {
      console.error(error);
      showStatus(
        error?.response?.data?.message || 'ยังไม่สามารถส่งรีวิวได้ในขณะนี้',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderHeader = () => {
    return <components.Header title='Leave a review' goBack={true} />;
  };

  const renderContent = () => {
    return (
      <div style={{padding: '32px 20px 20px 20px'}}>
        <img
          src={require('../assets/icons/15.png')}
          alt='order successful'
          style={{
            width: 225.18,
            display: 'block',
            margin: '0 auto',
            marginBottom: 14,
          }}
        />
        <h2
          style={{
            margin: 0,
            textAlign: 'center',
            ...theme.fonts.Mulish_700Bold,
            fontSize: 22,
            lineHeight: 1.2,
            color: theme.colors.mainColor,
            marginBottom: 12,
            textTransform: 'capitalize',
            whiteSpace: 'pre-line',
          }}
        >
          รีวิวสินค้า
        </h2>
        <p
          style={{
            margin: '0 20px 20px',
            textAlign: 'center',
            color: theme.colors.textColor,
            lineHeight: 1.7,
          }}
        >
          {productName}
        </p>
        <components.RatingStars
          containerStyle={{
            marginBottom: 20,
            alignSelf: 'center',
          }}
          setRating={setRating}
          rating={rating}
        />
        <p
          style={{
            margin: '0 20px',
            textAlign: 'center',
            color: theme.colors.textColor,
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          ความเห็นของคุณจะช่วยให้สมาชิกคนอื่นตัดสินใจได้ง่ายขึ้น
        </p>
        <div style={{position: 'relative'}}>
          <span
            style={{
              position: 'absolute',
              top: -8,
              left: 20,
              padding: '0 10px',
              borderRadius: 12,
              backgroundColor: '#fff',
              ...theme.fonts.Mulish_600SemiBold,
              fontSize: 12,
              textTransform: 'uppercase',
              color: theme.colors.textColor,
            }}
          >
            comment
          </span>
          <textarea
            className='input-field'
            style={{
              width: '100%',
              height: 130,
              borderColor: '#E8EFF4',
              marginBottom: 20,
              borderRadius: 12,
              display: 'block',
              boxSizing: 'border-box',
              verticalAlign: 'top',
              overflow: 'auto',
              textAlign: 'left',
              padding: '10px 30px',
              resize: 'none',
              color: theme.colors.mainColor,
            }}
            placeholder='บอกความประทับใจหรือข้อเสนอแนะเพิ่มเติม'
            value={comment}
            onChange={event => setComment(event.target.value)}
          />
        </div>

        {statusMessage ? (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: statusTone === 'success' ? '#ECFDF3' : '#FEF2F2',
              color: statusTone === 'success' ? '#027A48' : '#B42318',
              lineHeight: 1.5,
              ...theme.fonts.Mulish_600SemiBold,
            }}
          >
            {statusMessage}
          </div>
        ) : null}

        <components.Button
          title={submitting ? 'กำลังส่ง...' : 'submit'}
          onClick={handleSubmit}
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
