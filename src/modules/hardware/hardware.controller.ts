import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { HardwareService } from './hardware.service';
import { CreateHardwareDto } from './dto/create-hardware.dto';
import { UpdateHardwareDto } from './dto/update-hardware.dto';
import { AssignHardwareDto } from './dto/assign-hardware.dto';

@ApiTags('Hardware')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hardware')
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Get()
  @Permissions('hardware.view')
  async findAll() {
    return { data: await this.hardwareService.findAll() };
  }

  @Post()
  @Permissions('hardware.create')
  async create(@Body() body: CreateHardwareDto) {
    return { data: await this.hardwareService.create(body) };
  }

  @Patch(':id')
  @Permissions('hardware.edit')
  async update(@Param('id') id: string, @Body() body: UpdateHardwareDto) {
    return { data: await this.hardwareService.update(id, body) };
  }

  @Patch(':id/assign')
  @Permissions('hardware.assign')
  async assign(@Param('id') id: string, @Body() body: AssignHardwareDto) {
    return { data: await this.hardwareService.assign(id, body) };
  }

  @Delete(':id')
  @Permissions('hardware.delete')
  async remove(@Param('id') id: string) {
    return { data: await this.hardwareService.remove(id) };
  }
}
