import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ActivityLogService } from './activity-log.service';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @Permissions('dashboard.activity')
  async findAll(@Query('module') module?: string, @Query('limit') limit?: string) {
    const data = await this.activityLogService.findAll(module, Number(limit ?? 20));
    return { data };
  }
}
