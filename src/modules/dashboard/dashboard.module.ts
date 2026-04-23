import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Hardware, HardwareSchema } from '../hardware/schemas/hardware.schema';
import { Tool, ToolSchema } from '../tools/schemas/tool.schema';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Activity, ActivitySchema } from '../activity-log/schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: Hardware.name, schema: HardwareSchema },
      { name: Tool.name, schema: ToolSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
