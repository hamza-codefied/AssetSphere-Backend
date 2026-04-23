import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CustomFieldDto {
  @ApiProperty()
  @IsString()
  key!: string;

  @ApiProperty()
  @IsString()
  value!: string;
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

export class CreateHardwareDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 'Laptop' })
  @IsString()
  type!: string;

  @ApiPropertyOptional({ description: 'If omitted, backend auto-generates one.' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: ['Available', 'Assigned', 'Inactive'] })
  @IsOptional()
  @IsIn(['Available', 'Assigned', 'Inactive'])
  status?: 'Available' | 'Assigned' | 'Inactive';

  @ApiPropertyOptional({ description: 'Employee id for assignment' })
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
