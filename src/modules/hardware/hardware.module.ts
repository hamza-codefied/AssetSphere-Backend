import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hardware, HardwareSchema } from './schemas/hardware.schema';
import { HardwareService } from './hardware.service';
import { HardwareController } from './hardware.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Hardware.name, schema: HardwareSchema }]),
    ActivityLogModule,
    EmployeesModule,
  ],
  providers: [HardwareService],
  controllers: [HardwareController],
})
export class HardwareModule {}
