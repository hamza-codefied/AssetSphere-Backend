import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const ACCOUNT_TYPES = [
  'Gmail',
  'AWS',
  'Domain',
  'Slack',
  'GitHub',
  'Figma',
  'Notion',
  'Other',
] as const;

class CustomFieldDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  value?: string;
}

class TwoFactorDto {
  @ApiPropertyOptional({ enum: ['Authenticator', 'SMS', 'Email'] })
  @IsOptional()
  @IsIn(['Authenticator', 'SMS', 'Email'])
  type?: 'Authenticator' | 'SMS' | 'Email';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  recoveryEmail?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  backupCodes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  enrolledAt?: string;
}

class CredentialsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pin?: string;

  @ApiPropertyOptional({ type: [CustomFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];

  @ApiPropertyOptional({ type: TwoFactorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TwoFactorDto)
  twoFactor?: TwoFactorDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastUpdated?: string;
}

export class UpdateAccountDto {
  @ApiPropertyOptional({ enum: ACCOUNT_TYPES })
  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  type?: (typeof ACCOUNT_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ type: CredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials?: CredentialsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isCompanyOwned?: boolean;

  @ApiPropertyOptional({ enum: ['Active', 'Disabled'] })
  @IsOptional()
  @IsIn(['Active', 'Disabled'])
  status?: 'Active' | 'Disabled';
}
