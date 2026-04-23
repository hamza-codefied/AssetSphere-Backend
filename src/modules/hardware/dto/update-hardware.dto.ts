import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
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

class HardwareCredentialsDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastUpdated?: string;
}

export class UpdateHardwareDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: ['Available', 'Assigned', 'Inactive'] })
  @IsOptional()
  @IsIn(['Available', 'Assigned', 'Inactive'])
  status?: 'Available' | 'Assigned' | 'Inactive';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ type: HardwareCredentialsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HardwareCredentialsDto)
  credentials?: HardwareCredentialsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
