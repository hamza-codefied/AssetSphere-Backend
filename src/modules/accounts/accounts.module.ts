import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from './schemas/account.schema';
import { AccountsService } from './accounts.service';
import { AccountsController } from './accounts.controller';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Account.name, schema: AccountSchema }]),
    ActivityLogModule,
  ],
  providers: [AccountsService],
  controllers: [AccountsController],
})
export class AccountsModule {}
