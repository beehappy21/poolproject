import React from 'react';
import {useLocation} from 'react-router-dom';

import {theme} from '../constants';
import {components} from '../components';
import {toRenderableProductRichTextHtml} from '../utils';

export const Description: React.FC = () => {
  const location = useLocation();
  const item = location.state?.item;
  const descriptionHtml = toRenderableProductRichTextHtml(item?.description);

  if (!item) {
    return (
      <>
        <components.Header goBack={true} title='Description' />
        <div style={{padding: '30px 20px 20px 20px', color: theme.colors.textColor}}>
          ไม่พบข้อมูลสินค้า
        </div>
      </>
    );
  }

  const renderHeader = () => {
    return <components.Header goBack={true} title='Description' />;
  };

  const renderContent = () => {
    return (
      <div style={{padding: '30px 20px 20px 20px'}}>
        <style>{`
          .wap-description-screen img {
            display: block;
            width: auto !important;
            max-width: 100% !important;
            max-height: min(420px, 50vh) !important;
            height: auto !important;
            margin: 0 auto;
            object-fit: contain !important;
          }
          .wap-description-screen figure {
            margin: 0 0 1rem;
            text-align: center;
          }
        `}</style>
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
        <div
          className='wap-description-screen'
          style={{
            margin: 0,
            ...theme.fonts.Mulish_400Regular,
            fontSize: 16,
            color: theme.colors.textColor,
            lineHeight: 1.7,
          }}
          dangerouslySetInnerHTML={{
            __html: descriptionHtml || '<p>-</p>',
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
