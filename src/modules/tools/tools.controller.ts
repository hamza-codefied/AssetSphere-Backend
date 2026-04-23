import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ToolsService } from './tools.service';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { AssignToolDto } from './dto/assign-tool.dto';

@ApiTags('Tools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  @Permissions('tools.view')
  async findAll() {
    return { data: await this.toolsService.findAll() };
  }

  @Post()
  @Permissions('tools.create')
  async create(@Body() body: CreateToolDto) {
    return { data: await this.toolsService.create(body) };
  }

  @Patch(':id')
  @Permissions('tools.edit')
  async update(@Param('id') id: string, @Body() body: UpdateToolDto) {
    return { data: await this.toolsService.update(id, body) };
  }

  @Patch(':id/assign')
  @Permissions('tools.edit')
  async assign(@Param('id') id: string, @Body() body: AssignToolDto) {
    return { data: await this.toolsService.assign(id, body) };
  }

  @Delete(':id')
  @Permissions('tools.delete')
  async remove(@Param('id') id: string) {
    return { data: await this.toolsService.remove(id) };
  }
}
