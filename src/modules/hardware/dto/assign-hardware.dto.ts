import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignHardwareDto {
  @ApiPropertyOptional({ description: 'Employee id; omit/empty to unassign' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
