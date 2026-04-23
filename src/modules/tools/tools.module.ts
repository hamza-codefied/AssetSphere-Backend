import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tool, ToolSchema } from './schemas/tool.schema';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EmployeesModule } from '../employees/employees.module';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tool.name, schema: ToolSchema }]),
    ActivityLogModule,
    EmployeesModule,
    CommonModule,
  ],
  providers: [ToolsService],
  controllers: [ToolsController],
})
export class ToolsModule {}
