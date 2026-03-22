import React, {useRef, useEffect, ReactNode} from 'react';

type Props = {
  children: ReactNode;
  style?: React.CSSProperties;
};

export const ScrollView: React.FC<Props> = ({children, style}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const initialPos = useRef(0);
  const velocity = useRef(0);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    let lastTime = Date.now();

    const mouseDownHandler = (e: MouseEvent) => {
      isDragging.current = true;
      initialPos.current = e.clientX;
      lastTime = Date.now();
      hasScrolled.current = false;
    };

    const mouseMoveHandler = (e: MouseEvent) => {
      if (isDragging.current && scrollContainer) {
        const dx = initialPos.current - e.clientX;
        const dt = Date.now() - lastTime;

        if (Math.abs(dx) > 5) {
          hasScrolled.current = true;
        }

        velocity.current = dx / dt;
        scrollContainer.scrollLeft += dx;

        initialPos.current = e.clientX;
        lastTime = Date.now();
      }
    };

    const mouseUpHandler = (e: MouseEvent) => {
      if (isDragging.current && hasScrolled.current) {
        e.preventDefault();
        e.stopPropagation();
      }
      isDragging.current = false;
    };

    const clickHandler = (e: MouseEvent) => {
      if (hasScrolled.current) {
        e.preventDefault();
        e.stopPropagation();
        hasScrolled.current = false;
      }
    };

    const inertiaHandler = () => {
      if (
        !isDragging.current &&
        scrollContainer &&
        Math.abs(velocity.current) > 0.01
      ) {
        scrollContainer.scrollLeft += velocity.current * 15;
        velocity.current *= 0.95;
        requestAnimationFrame(inertiaHandler);
      }
    };

    scrollContainer.addEventListener('mousedown', mouseDownHandler);
    scrollContainer.addEventListener('mousemove', mouseMoveHandler);
    scrollContainer.addEventListener('mouseup', mouseUpHandler);
    scrollContainer.addEventListener('mouseleave', mouseUpHandler);
    scrollContainer.addEventListener('click', clickHandler);
    scrollContainer.addEventListener('mouseup', inertiaHandler);
    scrollContainer.addEventListener('mouseleave', inertiaHandler);

    return () => {
      scrollContainer.removeEventListener('mousedown', mouseDownHandler);
      scrollContainer.removeEventListener('mousemove', mouseMoveHandler);
      scrollContainer.removeEventListener('mouseup', mouseUpHandler);
      scrollContainer.removeEventListener('mouseleave', mouseUpHandler);
      scrollContainer.removeEventListener('click', clickHandler);
      scrollContainer.removeEventListener('mouseup', inertiaHandler);
      scrollContainer.removeEventListener('mouseleave', inertiaHandler);
    };
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      style={{
        display: 'flex',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
