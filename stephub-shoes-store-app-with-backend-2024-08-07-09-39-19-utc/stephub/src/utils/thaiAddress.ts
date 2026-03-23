import changwats from '../data/thai-tambons/changwats.json';
import amphoes from '../data/thai-tambons/amphoes.json';
import tambons from '../data/thai-tambons/tambons.json';

type NameRecord = {
  name: {
    th: string;
    en: string | null;
  };
};

type ProvinceRecord = NameRecord;

type DistrictRecord = NameRecord & {
  changwat_id: string;
};

type SubdistrictRecord = NameRecord & {
  zipcode: number | null;
  changwat_id: string;
  amphoe_id: string;
};

export type ThaiAddressOption = {
  code: string;
  nameTh: string;
  nameEn: string;
};

export type ThaiSubdistrictOption = ThaiAddressOption & {
  postalCode: string;
};

const provinceMap = changwats as Record<string, ProvinceRecord>;
const districtMap = amphoes as Record<string, DistrictRecord>;
const subdistrictMap = tambons as Record<string, SubdistrictRecord>;

export const thaiProvinceOptions: ThaiAddressOption[] = Object.entries(
  provinceMap,
)
  .map(([code, value]) => ({
    code,
    nameTh: value.name.th,
    nameEn: value.name.en ?? '',
  }))
  .sort((left, right) => left.nameTh.localeCompare(right.nameTh, 'th'));

export const getThaiDistrictOptions = (
  provinceCode: string,
): ThaiAddressOption[] => {
  return Object.entries(districtMap)
    .filter(([, value]) => value.changwat_id === provinceCode)
    .map(([code, value]) => ({
      code,
      nameTh: value.name.th,
      nameEn: value.name.en ?? '',
    }))
    .sort((left, right) => left.nameTh.localeCompare(right.nameTh, 'th'));
};

export const getThaiSubdistrictOptions = (
  districtCode: string,
): ThaiSubdistrictOption[] => {
  return Object.entries(subdistrictMap)
    .filter(([, value]) => value.amphoe_id === districtCode)
    .map(([code, value]) => ({
      code,
      nameTh: value.name.th,
      nameEn: value.name.en ?? '',
      postalCode: String(value.zipcode || ''),
    }))
    .sort((left, right) => left.nameTh.localeCompare(right.nameTh, 'th'));
};
