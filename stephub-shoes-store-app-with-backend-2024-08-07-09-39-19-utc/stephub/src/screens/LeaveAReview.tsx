import React, {useState} from 'react';

import {hooks} from '../hooks';
import {theme} from '../constants';
import {components} from '../components';

export const LeaveAReview: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const [rating, setRating] = useState<number>(0);

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
            marginBottom: 20,
            textTransform: 'capitalize',
            whiteSpace: 'pre-line',
          }}
        >
          Please rate the quality of service for the order!
        </h2>
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
            marginBottom: 38,
          }}
        >
          Your comments and suggestions help us improve the service quality
          better!
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
              marginBottom: 40,
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
            placeholder='Enter your comment'
          />
        </div>

        <components.Button
          title='submit'
          onClick={() => {
            navigate(-1);
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
