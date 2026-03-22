import React from 'react';
import {useLocation} from 'react-router-dom';

import {theme} from '../constants';
import {components} from '../components';

export const Description: React.FC = () => {
  const location = useLocation();
  const item = location.state.item;

  const renderHeader = () => {
    return <components.Header goBack={true} title='Description' />;
  };

  const renderContent = () => {
    return (
      <div style={{padding: '30px 20px 20px 20px'}}>
        <h3
          style={{
            margin: 0,
            marginBottom: 14,
            ...theme.fonts.Mulish_700Bold,
            fontWeight: 700,
            fontSize: 20,
            lineHeight: 1.2,
            color: theme.colors.mainColor,
          }}
        >
          {item.name}
        </h3>
        <p
          style={{
            margin: 0,
            ...theme.fonts.Mulish_400Regular,
            fontSize: 16,
            color: theme.colors.textColor,
            lineHeight: 1.7,
          }}
        >
          {item.description}
        </p>
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
