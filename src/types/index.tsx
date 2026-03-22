import type {TagType} from './TagType';
import type {UserType} from './UserType';
import type {SizeType} from './SizeType';
import type {ColorType} from './ColorType';
import type {BannerType} from './BannerType';
import type {ReviewType} from './ReviewType';
import type {ProductType} from './ProductType';
import type {CarouselType} from './CarouselType';
import type {CategoryType} from './CategoryType';
import type {AudienceType} from './AudienceType';
import type {PromocodeType} from './PromocodeType';

export type ViewableItemsChanged = {
  viewableItems: Array<any>;
  changed: Array<any>;
};

export type OnboardingTypes = {
  id: number;
  image: any;
  description: string;
  title: string;
};

export type {
  TagType,
  SizeType,
  UserType,
  ColorType,
  ReviewType,
  BannerType,
  ProductType,
  AudienceType,
  CategoryType,
  CarouselType,
  PromocodeType,
};
