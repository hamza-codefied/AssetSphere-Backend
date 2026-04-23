import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Permissions('projects.view')
  async findAll() {
    return { data: await this.projectsService.findAll() };
  }

  @Post()
  @Permissions('projects.create')
  async create(@Body() body: CreateProjectDto) {
    return { data: await this.projectsService.create(body) };
  }

  @Patch(':id')
  @Permissions('projects.edit')
  async update(@Param('id') id: string, @Body() body: UpdateProjectDto) {
    return { data: await this.projectsService.update(id, body) };
  }

  @Patch(':id/members')
  @Permissions('projects.manage_members')
  async updateMembers(
    @Param('id') id: string,
    @Body() body: { members: Array<{ employeeId: string; role: string }> },
  ) {
    return { data: await this.projectsService.updateMembers(id, body.members) };
  }

  @Post(':id/credentials')
  @Permissions('projects.edit')
  async addCredential(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return { data: await this.projectsService.addCredential(id, body) };
  }

  @Delete(':id')
  @Permissions('projects.delete')
  async remove(@Param('id') id: string) {
    return { data: await this.projectsService.remove(id) };
  }
}
