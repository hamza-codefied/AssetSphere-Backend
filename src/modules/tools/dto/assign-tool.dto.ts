import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignToolDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
