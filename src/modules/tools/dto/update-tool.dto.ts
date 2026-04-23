import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

class ToolCredentialsDto {
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

  @ApiPropertyOptional({ type: [CustomFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastUpdated?: string;
}

export class UpdateToolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiPropertyOptional({ enum: ['Active', 'Expired'] })
  @IsOptional()
  @IsIn(['Active', 'Expired'])
  status?: 'Active' | 'Expired';

  @ApiPropertyOptional({ type: ToolCredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ToolCredentialsDto)
  credentials?: ToolCredentialsDto;
}
