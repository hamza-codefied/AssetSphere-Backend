import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions('dashboard.view')
  async stats() {
    return { data: await this.dashboardService.getStats() };
  }

  @Get('alerts')
  @Permissions('dashboard.view')
  async alerts() {
    return { data: await this.dashboardService.getAlerts() };
  }

  @Get('activity')
  @Permissions('dashboard.activity')
  async activity(@Query('limit') limit?: string) {
    return { data: await this.dashboardService.getActivity(Number(limit ?? 10)) };
  }
}
