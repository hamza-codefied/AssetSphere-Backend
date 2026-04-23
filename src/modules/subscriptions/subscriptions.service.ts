import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { EncryptedValue } from '../../common/crypto/crypto.types';
import { CryptoService } from '../../common/crypto/crypto.service';
import { EmployeesService } from '../employees/employees.service';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

const MASK = '********';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly employeesService: EmployeesService,
    private readonly activityLogService: ActivityLogService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(payload: CreateSubscriptionDto) {
    await this.validateRelations(payload);
    const created = await this.subscriptionModel.create(
      this.recompute({
        ...payload,
        name: payload.name.trim(),
        vendor: payload.vendor.trim(),
        notes: payload.notes?.trim(),
        credentials: this.encryptCredentials(payload.credentials as unknown as Record<string, unknown> | undefined),
      }),
    );
    await this.log(`Added subscription: ${created.name}`, 'creation');
    return this.masked(created);
  }

  async findAll() {
    const docs = await this.subscriptionModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.maskedAndRecompute(doc));
  }

  async update(id: string, payload: UpdateSubscriptionDto) {
    await this.validateRelations(payload);
    const update: Record<string, unknown> = { ...payload };
    if (payload.name) update.name = payload.name.trim();
    if (payload.vendor) update.vendor = payload.vendor.trim();
    if (payload.notes !== undefined) update.notes = payload.notes?.trim() || undefined;
    if (payload.credentials) {
      const current = await this.findById(id);
      update.credentials = this.encryptCredentials(
        payload.credentials as unknown as Record<string, unknown>,
        current.credentials as Record<string, unknown> | undefined,
      );
    }
    const updated = await this.subscriptionModel
      .findByIdAndUpdate(id, this.recompute(update), { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Subscription not found');
    await this.log(`Updated subscription: ${updated.name}`, 'update');
    return this.maskedAndRecompute(updated);
  }

  async reveal(id: string) {
    const doc = await this.findById(id);
    const creds = (doc.toObject() as unknown as Record<string, unknown>)
      .credentials as Record<string, unknown> | undefined;
    const result: Record<string, unknown> = {};
    if (!creds) return result;
    if (this.isEncryptedValue(creds.password)) {
      result.password = this.cryptoService.decrypt(creds.password);
    }
    return result;
  }

  async remove(id: string) {
    const deleted = await this.subscriptionModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Subscription not found');
    await this.log(`Deleted subscription: ${deleted.name}`, 'deletion');
    return this.masked(deleted);
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Subscription not found');
    const doc = await this.subscriptionModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Subscription not found');
    return doc;
  }

  private recompute(payload: Partial<Subscription>) {
    // If status is explicitly provided (e.g. user changed it in UI),
    // preserve that value instead of auto-overriding from renewal date.
    if (payload.status) return payload;
    if (!payload.renewalDate || payload.status === 'Cancelled') return payload;
    const days = Math.ceil(
      (new Date(payload.renewalDate).getTime() - Date.now()) / 86_400_000,
    );
    if (days < 0) return { ...payload, status: 'Expired' };
    if (days <= 30) return { ...payload, status: 'Expiring Soon' };
    return { ...payload, status: payload.status ?? 'Active' };
  }

  private maskedAndRecompute(doc: SubscriptionDocument) {
    const update = this.recompute(doc.toObject());
    return { ...this.masked(doc), ...update };
  }

  private async validateRelations(payload: {
    assignmentScope?: string;
    assignedToIds?: string[];
    linkedAccountId?: string;
  }) {
    if (payload.assignmentScope === 'Company-Wide') return;
    if (Array.isArray(payload.assignedToIds)) {
      for (const employeeId of payload.assignedToIds) {
        const employee = await this.employeesService.findById(employeeId);
        if (employee.role === 'admin') {
          throw new BadRequestException('Admin cannot be assigned to subscriptions');
        }
        if (!employee.isActive || employee.status === 'Inactive') {
          throw new BadRequestException('Cannot assign inactive employee to subscription');
        }
      }
    }
    if (payload.linkedAccountId) {
      if (!Types.ObjectId.isValid(payload.linkedAccountId)) {
        throw new BadRequestException('Linked account not found');
      }
      const account = await this.connection.collection('accounts').findOne({
        _id: new Types.ObjectId(payload.linkedAccountId),
      });
      if (!account) throw new BadRequestException('Linked account not found');
    }
  }

  private encryptCredentials(
    credentials?: Record<string, unknown>,
    existing?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!credentials) return existing;
    const result: Record<string, unknown> = {
      ...(existing ?? {}),
      ...credentials,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    if (typeof result.password === 'string' && result.password && result.password !== MASK) {
      result.password = this.cryptoService.encrypt(result.password);
    }
    return result;
  }

  private masked(doc: SubscriptionDocument): Record<string, unknown> {
    const plain = doc.toObject() as unknown as Record<string, unknown>;
    const credentials = plain.credentials as Record<string, unknown> | undefined;
    if (!credentials) return plain;
    const cloned = { ...credentials };
    if (this.isEncryptedValue(cloned.password)) cloned.password = MASK;
    plain.credentials = cloned;
    return plain;
  }

  private isEncryptedValue(value: unknown): value is EncryptedValue {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.iv === 'string' &&
      typeof candidate.tag === 'string' &&
      typeof candidate.ciphertext === 'string'
    );
  }

  private async log(description: string, type: string) {
    await this.activityLogService.add({
      type,
      description,
      module: 'Subscriptions',
      userId: 'system',
      userName: 'System',
      timestamp: new Date().toISOString(),
    });
  }
}
