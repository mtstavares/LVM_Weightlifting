import { AthleteSex } from '@prisma/client';

export const WEIGHT_CATEGORIES: Record<AthleteSex, readonly string[]> = {
  FEMALE: ['49', '53', '57', '61', '69', '77', '86', '+86'],
  MALE: ['60', '65', '70', '75', '85', '95', '110', '+110']
};
