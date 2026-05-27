export const formatTHB = (value: number | string | null | undefined): string => {
  const amount = Number(value || 0);

  return `฿${amount.toFixed(2)}`;
};

export const formatTHBText = (
  value: number | string | null | undefined,
): string => {
  const amount = Number(value || 0);

  return `${amount.toFixed(2)} บาท`;
};

export const formatDecimalMax2 = (
  value: number | string | null | undefined,
): string => {
  const amount = Number(value || 0);
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safeAmount);
};
