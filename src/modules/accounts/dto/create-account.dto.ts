import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
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
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  value!: string;
}

class TwoFactorDto {
  @ApiProperty({ enum: ['Authenticator', 'SMS', 'Email'] })
  @IsIn(['Authenticator', 'SMS', 'Email'])
  type!: 'Authenticator' | 'SMS' | 'Email';

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

  @ApiProperty()
  @IsString()
  lastUpdated!: string;
}

export class CreateAccountDto {
  @ApiProperty({ enum: ACCOUNT_TYPES })
  @IsIn(ACCOUNT_TYPES)
  type!: (typeof ACCOUNT_TYPES)[number];

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ type: CredentialsDto })
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials!: CredentialsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isCompanyOwned?: boolean;

  @ApiPropertyOptional({ enum: ['Active', 'Disabled'], default: 'Active' })
  @IsOptional()
  @IsIn(['Active', 'Disabled'])
  status?: 'Active' | 'Disabled';
}
