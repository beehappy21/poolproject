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
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
