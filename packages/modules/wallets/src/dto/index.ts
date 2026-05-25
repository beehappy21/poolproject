export class GetWalletDto {}
export class ReleaseWalletHoldDto {}

import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class WalletTopupDto {
  @IsString()
  @Matches(/^\d+(\.\d+)?$/)
  amount!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
