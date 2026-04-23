import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { EncryptedValue } from '../../common/crypto/crypto.types';

type AnyRecord = Record<string, any>;
const MASK = '********';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private readonly accountModel: Model<AccountDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cryptoService: CryptoService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(payload: CreateAccountDto) {
    const email = payload.email.toLowerCase().trim();
    const existing = await this.accountModel.exists({ email });
    if (existing) throw new ConflictException('Email already in use');
    const sanitized = this.encryptSensitive({
      ...payload,
      email,
      credentials: {
        ...payload.credentials,
        email: payload.credentials.email?.toLowerCase?.() ?? payload.credentials.email,
      },
    });
    const created = await this.accountModel.create(sanitized);
    await this.log(`Created central account: ${created.email}`, 'creation');
    return this.masked(created);
  }

  async findAll() {
    const docs = await this.accountModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.masked(doc));
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Account not found');
    const doc = await this.accountModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Account not found');
    return this.masked(doc);
  }

  async update(id: string, payload: UpdateAccountDto) {
    if (payload.email) {
      const normalized = payload.email.toLowerCase().trim();
      const duplicate = await this.accountModel.exists({ email: normalized, _id: { $ne: id } });
      if (duplicate) throw new ConflictException('Email already in use');
      payload.email = normalized;
    }
    const sanitized = this.encryptSensitive(payload);
    const updated = await this.accountModel
      .findByIdAndUpdate(id, sanitized, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Account not found');
    await this.log(`Updated account: ${updated.email}`, 'update');
    return this.masked(updated);
  }

  async remove(id: string) {
    const deleted = await this.accountModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Account not found');
    await this.connection.collection('tools').updateMany(
      { linkedAccountId: id },
      { $set: { linkedAccountId: null } },
    );
    await this.log(`Deleted account: ${deleted.email}`, 'deletion');
    return this.masked(deleted);
  }

  async regenerateBackupCodes(id: string) {
    const account = await this.accountModel.findById(id).exec();
    if (!account) throw new NotFoundException('Account not found');
    const credentials = { ...(account.credentials ?? {}) } as AnyRecord;
    const tf = credentials.twoFactor ?? {};
    tf.backupCodes = Array.from({ length: 8 }).map(() =>
      Math.random().toString(36).slice(2, 10).toUpperCase(),
    );
    tf.enrolledAt = tf.enrolledAt ?? new Date().toISOString().split('T')[0];
    credentials.twoFactor = tf;
    account.credentials = this.encryptCredentials(credentials);
    await account.save();
    await this.log(`Regenerated backup codes: ${account.email}`, 'security');
    return this.masked(account);
  }

  private encryptSensitive(payload: AnyRecord) {
    if (!payload.credentials) return payload;
    return { ...payload, credentials: this.encryptCredentials(payload.credentials as AnyRecord) };
  }

  private encryptCredentials(credentials: AnyRecord) {
    const result = { ...credentials };
    if (typeof result.password === 'string' && result.password !== MASK) {
      result.password = this.cryptoService.encrypt(result.password);
    }
    if (typeof result.twoFactor?.secret === 'string' && result.twoFactor.secret !== MASK) {
      result.twoFactor.secret = this.cryptoService.encrypt(result.twoFactor.secret);
    }
    if (Array.isArray(result.twoFactor?.backupCodes)) {
      result.twoFactor.backupCodes = result.twoFactor.backupCodes.map((code: unknown) => {
        if (typeof code !== 'string') return code;
        if (code === MASK) return code;
        return this.cryptoService.encrypt(code);
      });
    }
    if (Array.isArray(result.customFields)) {
      result.customFields = result.customFields.map((item: { key: string; value: string }) => ({
        ...item,
        value: item.value === MASK ? item.value : this.cryptoService.encrypt(item.value),
      }));
    }
    return result;
  }

  private masked(doc: AccountDocument) {
    const plain = doc.toObject() as AnyRecord;
    if (plain.credentials?.password && this.isEncryptedValue(plain.credentials.password)) {
      plain.credentials.password = MASK;
    }
    if (plain.credentials?.twoFactor?.secret && this.isEncryptedValue(plain.credentials.twoFactor.secret)) {
      plain.credentials.twoFactor.secret = MASK;
    }
    if (Array.isArray(plain.credentials?.twoFactor?.backupCodes)) {
      plain.credentials.twoFactor.backupCodes = plain.credentials.twoFactor.backupCodes.map(() => MASK);
    }
    if (Array.isArray(plain.credentials?.customFields)) {
      plain.credentials.customFields = plain.credentials.customFields.map((f: any) => ({
        ...f,
        value: MASK,
      }));
    }
    return plain;
  }

  private isEncryptedValue(value: unknown): value is EncryptedValue {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return (
      typeof record.iv === 'string' &&
      typeof record.tag === 'string' &&
      typeof record.ciphertext === 'string'
    );
  }

  private async log(description: string, type: string) {
    await this.activityLogService.add({
      type,
      description,
      module: 'Accounts',
      userId: 'system',
      userName: 'System',
      timestamp: new Date().toISOString(),
    });
  }
}
