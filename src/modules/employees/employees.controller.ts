import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { OffboardEmployeeDto } from './dto/offboard-employee.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @Permissions('employees.view')
  async findAll() {
    const employees = await this.employeesService.findAll();
    return { data: employees.map((e) => this.employeesService.sanitize(e)) };
  }

  @Get(':id')
  @Permissions('employees.view')
  async findOne(@Param('id') id: string) {
    const employee = await this.employeesService.findById(id);
    return { data: this.employeesService.sanitize(employee) };
  }

  @Post()
  @Permissions('employees.create')
  async create(@Body() body: CreateEmployeeDto) {
    const employee = await this.employeesService.create(body);
    return { data: this.employeesService.sanitize(employee) };
  }

  @Patch(':id')
  @Permissions('employees.edit')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateEmployeeDto,
    @CurrentUser() current: { role?: string; id?: string },
  ) {
    // Non-admins cannot change another employee's role or elevate privileges.
    if (current.role !== 'admin' && body.role) {
      throw new ForbiddenException('Only admin can change roles');
    }
    const employee = await this.employeesService.update(id, body);
    return { data: this.employeesService.sanitize(employee) };
  }

  @Post(':id/offboard')
  @Permissions('employees.offboard')
  async offboard(@Param('id') id: string, @Body() body: OffboardEmployeeDto) {
    const employee = await this.employeesService.offboard(id, body?.notes);
    return { data: employee ? this.employeesService.sanitize(employee) : null };
  }

  @Delete(':id')
  @Permissions('employees.deactivate')
  async remove(@Param('id') id: string) {
    const employee = await this.employeesService.remove(id);
    return { data: this.employeesService.sanitize(employee) };
  }
}
