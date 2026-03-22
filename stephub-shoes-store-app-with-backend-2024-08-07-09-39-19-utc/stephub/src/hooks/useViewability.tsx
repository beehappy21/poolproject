import {useState, useRef} from 'react';

type ViewableItemsChanged = {
  viewableItems: Array<{index: number | null}>;
};

export function useViewability() {
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef((info: ViewableItemsChanged) => {
    const index = info.viewableItems[0]?.index ?? 0;
    setActiveIndex(index);
  }).current;

  return {activeIndex, viewabilityConfig, onViewableItemsChanged};
}
