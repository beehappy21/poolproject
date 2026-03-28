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
