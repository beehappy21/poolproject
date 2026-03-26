import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

export function requireNonEmptyString(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestException(`${fieldName} is required.`);
  }

  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}

export function optionalUrlString(
  value: unknown,
  fieldName: string,
): string | undefined {
  const normalized = optionalString(value);

  if (!normalized) {
    return undefined;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new BadRequestException(`${fieldName} must be a valid http or https URL.`);
  }

  return normalized;
}

export function optionalImageReferenceString(
  value: unknown,
  fieldName: string,
): string | undefined {
  const normalized = optionalString(value);

  if (!normalized) {
    return undefined;
  }

  if (/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(normalized)) {
    return normalized;
  }

  return optionalUrlString(normalized, fieldName);
}

export function optionalUrlStringArray(
  value: unknown,
  fieldName: string,
  maxItems: number,
): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestException(`${fieldName} must be an array.`);
  }

  if (value.length > maxItems) {
    throw new BadRequestException(`${fieldName} must contain at most ${maxItems} items.`);
  }

  return value.map((item, index) =>
    optionalUrlString(item, `${fieldName}[${index}]`) ?? (() => {
      throw new BadRequestException(`${fieldName}[${index}] is required.`);
    })(),
  );
}

export function requirePositiveIntegerString(
  value: unknown,
  fieldName: string,
): string {
  const normalized = requireNonEmptyString(value, fieldName);

  if (!/^[1-9]\d*$/.test(normalized)) {
    throw new BadRequestException(`${fieldName} must be a positive integer string.`);
  }

  return normalized;
}

export function requireDecimalString(value: unknown, fieldName: string): string {
  const normalized = requireNonEmptyString(value, fieldName);

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new BadRequestException(`${fieldName} must be a valid decimal string.`);
  }

  return normalized;
}

export function requireDecimalRateString(value: unknown, fieldName: string): string {
  const normalized = requireDecimalString(value, fieldName);
  const numericValue = Number(normalized);

  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1) {
    throw new BadRequestException(`${fieldName} must be between 0 and 1.`);
  }

  return normalized;
}

export function requirePositiveInteger(value: unknown, fieldName: string): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    Number.isNaN(value) ||
    value <= 0
  ) {
    throw new BadRequestException(`${fieldName} must be a positive integer.`);
  }

  return value;
}

export function optionalPositiveInteger(
  value: unknown,
  fieldName: string,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return requirePositiveInteger(Number(value), fieldName);
}

export function requireDateOnlyString(value: unknown, fieldName: string): string {
  const normalized = requireNonEmptyString(value, fieldName);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new BadRequestException(`${fieldName} must be in YYYY-MM-DD format.`);
  }

  return normalized;
}

export function requireIsoDateTimeString(
  value: unknown,
  fieldName: string,
): string {
  const normalized = requireNonEmptyString(value, fieldName);
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${fieldName} must be a valid ISO datetime.`);
  }

  return parsed.toISOString();
}

export function rethrowHttpError(error: unknown): never {
  if (
    error instanceof BadRequestException ||
    error instanceof NotFoundException ||
    error instanceof ConflictException
  ) {
    throw error;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new ConflictException("Duplicate value.");
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    throw new BadRequestException("Invalid reference.");
  }

  if (error instanceof Error) {
    if (error.message === "Sponsor not found.") {
      throw new BadRequestException("รหัสผู้แนะนำไม่ถูกต้อง");
    }

    if (error.message === "Member not found.") {
      throw new NotFoundException(error.message);
    }

    if (
      error.message === "Order not found." ||
      error.message === "Approved order not found." ||
      error.message === "Package not found." ||
      error.message === "Product detail not found." ||
      error.message === "Shipping address not found."
    ) {
      throw new NotFoundException(error.message);
    }
  }

  throw new BadRequestException("Request failed.");
}
