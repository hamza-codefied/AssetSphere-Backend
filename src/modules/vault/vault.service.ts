import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import { Hardware, HardwareDocument } from '../hardware/schemas/hardware.schema';
import { Tool, ToolDocument } from '../tools/schemas/tool.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { CryptoService } from '../../common/crypto/crypto.service';

@Injectable()
export class VaultService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Hardware.name) private readonly hardwareModel: Model<HardwareDocument>,
    @InjectModel(Tool.name) private readonly toolModel: Model<ToolDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    private readonly cryptoService: CryptoService,
  ) {}

  async getVault() {
    const [accounts, hardware, tools, subscriptions, projects] = await Promise.all([
      this.accountModel.find().lean(),
      this.hardwareModel.find().lean(),
      this.toolModel.find().lean(),
      this.subscriptionModel.find().lean(),
      this.projectModel.find().lean(),
    ]);
    return { accounts, hardware, tools, subscriptions, projects };
  }

  reveal(payload: { encrypted: { iv: string; tag: string; ciphertext: string } }) {
    return this.cryptoService.decrypt(payload.encrypted);
  }
}
