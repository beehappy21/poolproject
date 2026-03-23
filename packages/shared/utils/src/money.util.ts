const DECIMAL_SCALE = 6n;
const DECIMAL_FACTOR = 10n ** DECIMAL_SCALE;

function normalizeDecimalInput(value: string): string {
  const trimmed = (value || "0").trim();

  if (trimmed === "") {
    return "0";
  }

  return trimmed;
}

function decimalToScaledInt(value: string): bigint {
  const normalized = normalizeDecimalInput(value);
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [wholePartRaw, fractionalPartRaw = ""] = unsigned.split(".");
  const wholePart = wholePartRaw === "" ? "0" : wholePartRaw;
  const fractionalPart = fractionalPartRaw
    .replace(/[^0-9]/g, "")
    .padEnd(Number(DECIMAL_SCALE), "0")
    .slice(0, Number(DECIMAL_SCALE));
  const scaled =
    BigInt(wholePart) * DECIMAL_FACTOR + BigInt(fractionalPart || "0");

  return negative ? -scaled : scaled;
}

function scaledIntToDecimal(value: bigint): string {
  const negative = value < 0n;
  const unsigned = negative ? -value : value;
  const wholePart = unsigned / DECIMAL_FACTOR;
  const fractionalPart = (unsigned % DECIMAL_FACTOR)
    .toString()
    .padStart(Number(DECIMAL_SCALE), "0")
    .replace(/0+$/, "");

  const result =
    fractionalPart.length > 0
      ? `${wholePart.toString()}.${fractionalPart}`
      : wholePart.toString();

  return negative ? `-${result}` : result;
}

export function addDecimalStrings(left: string, right: string): string {
  return scaledIntToDecimal(
    decimalToScaledInt(left) + decimalToScaledInt(right),
  );
}

export function subtractDecimalStrings(left: string, right: string): string {
  return scaledIntToDecimal(
    decimalToScaledInt(left) - decimalToScaledInt(right),
  );
}

export function multiplyDecimalStrings(left: string, right: string): string {
  return scaledIntToDecimal(
    (decimalToScaledInt(left) * decimalToScaledInt(right)) / DECIMAL_FACTOR,
  );
}

export function divideDecimalStringByInt(
  value: string,
  divisor: number,
): string {
  if (divisor <= 0) {
    return "0";
  }

  return scaledIntToDecimal(decimalToScaledInt(value) / BigInt(divisor));
}

export function divideDecimalStrings(left: string, right: string): string {
  if (compareDecimalStrings(right, "0") <= 0) {
    return "0";
  }

  return scaledIntToDecimal(
    (decimalToScaledInt(left) * DECIMAL_FACTOR) / decimalToScaledInt(right),
  );
}

export function compareDecimalStrings(left: string, right: string): number {
  const leftValue = decimalToScaledInt(left);
  const rightValue = decimalToScaledInt(right);

  if (leftValue === rightValue) {
    return 0;
  }

  return leftValue > rightValue ? 1 : -1;
}

export function maxDecimalString(left: string, right: string): string {
  return compareDecimalStrings(left, right) >= 0 ? left : right;
}

export function minDecimalString(left: string, right: string): string {
  return compareDecimalStrings(left, right) <= 0 ? left : right;
}

export function floorDecimalString(value: string): string {
  const scaled = decimalToScaledInt(value);
  const whole =
    scaled >= 0n
      ? scaled / DECIMAL_FACTOR
      : -((-scaled + DECIMAL_FACTOR - 1n) / DECIMAL_FACTOR);

  return whole.toString();
}
