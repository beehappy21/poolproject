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
    if (error.message === "Member not found.") {
      throw new NotFoundException(error.message);
    }

    if (
      error.message === "Order not found." ||
      error.message === "Approved order not found." ||
      error.message === "Package not found."
    ) {
      throw new NotFoundException(error.message);
    }
  }

  throw new BadRequestException("Request failed.");
}
