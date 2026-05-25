import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {}

export class LoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  identifier!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password!: string;
}

export class ForgotPasswordResetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  identifier!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  adminOverridePassword?: string;
}

export class LineLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  lineUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  lineIdToken?: string;
}

export class LineBindingDto extends LineLoginDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  pictureUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  statusMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  source?: string;
}

export class TransferSlipDto {
  @IsString()
  @MinLength(1)
  @MaxLength(7_000_000)
  @Matches(/^(https?:\/\/|data:image\/(?:png|jpeg|jpg|webp);base64,)/i)
  transferSlipUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  transferSlipNote?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(256)
  newPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  adminOverridePassword?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  adminOverridePassword?: string;
}
