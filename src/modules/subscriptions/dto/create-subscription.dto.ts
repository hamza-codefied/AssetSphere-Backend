import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CredentialsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastUpdated?: string;
}

export class CreateSubscriptionDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  vendor!: string;

  @ApiProperty({ enum: ['SaaS', 'License', 'Cloud', 'Vendor', 'Other'] })
  @IsIn(['SaaS', 'License', 'Cloud', 'Vendor', 'Other'])
  type!: 'SaaS' | 'License' | 'Cloud' | 'Vendor' | 'Other';

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  cost!: number;

  @ApiProperty({ enum: ['Monthly', 'Quarterly', 'Annual', 'One-Time'] })
  @IsIn(['Monthly', 'Quarterly', 'Annual', 'One-Time'])
  billingCycle!: 'Monthly' | 'Quarterly' | 'Annual' | 'One-Time';

  @ApiProperty()
  @IsString()
  purchaseDate!: string;

  @ApiProperty()
  @IsString()
  renewalDate!: string;

  @ApiPropertyOptional({ enum: ['Active', 'Expiring Soon', 'Expired', 'Cancelled'] })
  @IsOptional()
  @IsIn(['Active', 'Expiring Soon', 'Expired', 'Cancelled'])
  status?: 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled';

  @ApiPropertyOptional({ enum: ['Individual', 'Team', 'Company-Wide'] })
  @IsOptional()
  @IsIn(['Individual', 'Team', 'Company-Wide'])
  assignmentScope?: 'Individual' | 'Team' | 'Company-Wide';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedToIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedAccountId?: string;

  @ApiPropertyOptional({ type: CredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CredentialsDto)
  credentials?: CredentialsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  licenseCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  alertDays?: number[];
}
