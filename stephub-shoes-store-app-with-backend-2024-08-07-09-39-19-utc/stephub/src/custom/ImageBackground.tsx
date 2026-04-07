import React, {ReactNode} from 'react';

type Props = {
  children: ReactNode;
  imageUrl?: string;
  style?: React.CSSProperties;
};

export const ImageBackground: React.FC<Props> = ({
  children,
  imageUrl,
  style,
}) => {
  const fallbackImage = '/16.png';

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        backgroundColor: '#F4F6F8',
        ...style,
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=''
          loading='lazy'
          decoding='async'
          onError={event => {
            if (event.currentTarget.src !== fallbackImage) {
              event.currentTarget.src = fallbackImage;
            }
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      ) : null}
      {children}
    </div>
  );
};
