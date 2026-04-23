import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';
import { Hardware, HardwareSchema } from '../hardware/schemas/hardware.schema';
import { Tool, ToolSchema } from '../tools/schemas/tool.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: Hardware.name, schema: HardwareSchema },
      { name: Tool.name, schema: ToolSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [VaultController],
  providers: [VaultService],
})
export class VaultModule {}
