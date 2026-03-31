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
  const fallbackImage =
    'data:image/svg+xml;base64,' +
    btoa(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect width="100%" height="100%" fill="#F4F6F8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#94A3B8">No Image</text></svg>',
    );

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
