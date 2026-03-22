import React from 'react';

import {hooks} from '../hooks';
import {custom} from '../custom';
import {components} from '../components';

export const EditProfile: React.FC = () => {
  const navigate = hooks.useAppNavigate();

  const renderHeader = () => {
    return <components.Header goBack={true} title='Edit profile' />;
  };

  const renderContent = () => {
    return (
      <div
        style={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 40,
          paddingBottom: 20,
        }}
      >
        <custom.InputField
          label='email'
          containerStyle={{marginBottom: 20}}
          placeholder='Zenith Sneaks'
        />
        <custom.InputField
          label='password'
          containerStyle={{marginBottom: 20}}
          placeholder='zenithsneaks@mail.com'
        />
        <custom.InputField
          label='email'
          containerStyle={{marginBottom: 20}}
          placeholder='+17123456789'
        />
        <custom.InputField
          label='password'
          containerStyle={{marginBottom: 20}}
          placeholder='Chicago, USA'
        />
        <components.Button
          title='save changes'
          onClick={() => {
            navigate('/InfoSaved');
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
