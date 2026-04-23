import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Hardware, HardwareDocument } from '../hardware/schemas/hardware.schema';
import { Tool, ToolDocument } from '../tools/schemas/tool.schema';
import { Account, AccountDocument } from '../accounts/schemas/account.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Activity, ActivityDocument } from '../activity-log/schemas/activity.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Hardware.name) private readonly hardwareModel: Model<HardwareDocument>,
    @InjectModel(Tool.name) private readonly toolModel: Model<ToolDocument>,
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
  ) {}

  async getStats() {
    const [employees, hardware, tools, accounts, subscriptions, projects] = await Promise.all([
      this.employeeModel.countDocuments({ status: 'Active' }),
      this.hardwareModel.countDocuments(),
      this.toolModel.countDocuments({ status: 'Active' }),
      this.accountModel.countDocuments(),
      this.subscriptionModel.countDocuments({ status: { $in: ['Active', 'Expiring Soon'] } }),
      this.projectModel.countDocuments({ status: 'Active' }),
    ]);
    return { employees, hardware, tools, accounts, subscriptions, projects };
  }

  async getAlerts() {
    const tools = await this.toolModel.find().lean();
    const subscriptions = await this.subscriptionModel.find().lean();
    const accounts = await this.accountModel.find().lean();
    const now = Date.now();
    const expiringTools = tools.filter((tool) => {
      if (!tool.expiryDate) return false;
      const diff = Math.ceil((new Date(tool.expiryDate).getTime() - now) / 86_400_000);
      return diff <= 30;
    });
    const expiringSubscriptions = subscriptions.filter((sub) =>
      ['Expiring Soon', 'Expired'].includes(sub.status),
    );
    const accountsWithout2FA = accounts.filter(
      (account) => account.status === 'Active' && !(account.credentials as any)?.twoFactor,
    );
    return { expiringTools, expiringSubscriptions, accountsWithout2FA };
  }

  async getActivity(limit = 10) {
    return this.activityModel.find().sort({ timestamp: -1 }).limit(limit).lean();
  }
}
