import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { CommonModule } from '../../common/common.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    ActivityLogModule,
    CommonModule,
    EmployeesModule,
  ],
  providers: [ProjectsService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
