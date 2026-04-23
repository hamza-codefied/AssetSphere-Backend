import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { EncryptedValue } from '../../common/crypto/crypto.types';
import { CryptoService } from '../../common/crypto/crypto.service';
import { Tool, ToolDocument } from './schemas/tool.schema';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EmployeesService } from '../employees/employees.service';
import { AssignToolDto } from './dto/assign-tool.dto';
import { CreateToolDto } from './dto/create-tool.dto';
import { UpdateToolDto } from './dto/update-tool.dto';

const MASK = '********';

@Injectable()
export class ToolsService {
  constructor(
    @InjectModel(Tool.name) private readonly toolModel: Model<ToolDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly employeesService: EmployeesService,
    private readonly activityLogService: ActivityLogService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(payload: CreateToolDto) {
    const assignedToId = await this.resolveAssignee(payload.assignedToId);
    await this.resolveLinkedAccount(payload.linkedAccountId);

    const created = await this.toolModel.create({
      name: payload.name.trim(),
      linkedAccountId: payload.linkedAccountId || undefined,
      assignedToId,
      expiryDate: payload.expiryDate,
      status: payload.status ?? 'Active',
      credentials: this.encryptCredentials(payload.credentials as unknown as Record<string, unknown> | undefined),
    });

    await this.syncEmployeeToolCounts(assignedToId);
    await this.log(`Added tool: ${created.name}`, 'creation');
    return this.masked(created);
  }

  async findAll() {
    const docs = await this.toolModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.masked(doc));
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Tool not found');
    const doc = await this.toolModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Tool not found');
    return doc;
  }

  async update(id: string, payload: UpdateToolDto) {
    const current = await this.findById(id);
    const previousAssigneeId = this.normalizeAssignee(current.assignedToId);

    const update: Record<string, unknown> = {};
    if (typeof payload.name === 'string') update.name = payload.name.trim();
    if (typeof payload.expiryDate === 'string') update.expiryDate = payload.expiryDate;
    if (payload.status) update.status = payload.status;

    if (payload.linkedAccountId !== undefined) {
      await this.resolveLinkedAccount(payload.linkedAccountId);
      update.linkedAccountId = payload.linkedAccountId || undefined;
    }

    if (payload.credentials) {
      update.credentials = this.encryptCredentials(
        payload.credentials as unknown as Record<string, unknown>,
        current.credentials as Record<string, unknown> | undefined,
      );
    }

    if (payload.assignedToId !== undefined) {
      update.assignedToId = await this.resolveAssignee(payload.assignedToId);
    }

    const updated = await this.toolModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Tool not found');

    await this.syncEmployeeToolCounts(previousAssigneeId, this.normalizeAssignee(updated.assignedToId));
    await this.log(`Updated tool: ${updated.name}`, 'update');
    return this.masked(updated);
  }

  async assign(id: string, payload: AssignToolDto) {
    const tool = await this.findById(id);
    const previousAssigneeId = this.normalizeAssignee(tool.assignedToId);
    const assignedToId = await this.resolveAssignee(payload.assignedToId);

    const updated = await this.toolModel
      .findByIdAndUpdate(id, { assignedToId }, { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Tool not found');

    await this.syncEmployeeToolCounts(previousAssigneeId, this.normalizeAssignee(updated.assignedToId));
    await this.log(assignedToId ? `Assigned tool: ${tool.name}` : `Unassigned tool: ${tool.name}`, 'assignment');
    return this.masked(updated);
  }

  async remove(id: string) {
    const deleted = await this.toolModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Tool not found');
    await this.syncEmployeeToolCounts(this.normalizeAssignee(deleted.assignedToId));
    await this.log(`Removed tool: ${deleted.name}`, 'deletion');
    return this.masked(deleted);
  }

  private async resolveAssignee(assignedToId?: string | null): Promise<string | undefined> {
    if (!assignedToId) return undefined;
    const employee = await this.employeesService.findById(assignedToId);
    if (employee.role === 'admin') {
      throw new BadRequestException('Admin cannot be assigned tools');
    }
    if (!employee.isActive || employee.status === 'Inactive') {
      throw new BadRequestException('Cannot assign tools to an inactive employee');
    }
    return assignedToId;
  }

  private async resolveLinkedAccount(linkedAccountId?: string | null): Promise<void> {
    if (!linkedAccountId) return;
    if (!Types.ObjectId.isValid(linkedAccountId)) {
      throw new BadRequestException('Linked account not found');
    }
    const account = await this.connection
      .collection('accounts')
      .findOne({ _id: new Types.ObjectId(linkedAccountId) });
    if (!account) {
      throw new BadRequestException('Linked account not found');
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

    if (Array.isArray(result.customFields)) {
      result.customFields = result.customFields.map((item: unknown) => {
        const field = item as Record<string, unknown>;
        if (typeof field?.value !== 'string') return item;
        return {
          ...field,
          value: field.value === MASK ? field.value : this.cryptoService.encrypt(field.value),
        };
      });
    }

    return result;
  }

  private masked(tool: ToolDocument): Record<string, unknown> {
    const plain = tool.toJSON() as unknown as Record<string, unknown>;
    const creds = plain.credentials as Record<string, unknown> | undefined;
    if (!creds) return plain;

    const clone = { ...creds };
    if (this.isEncryptedValue(clone.password)) clone.password = MASK;
    if (Array.isArray(clone.customFields)) {
      clone.customFields = (clone.customFields as Array<Record<string, unknown>>).map((field) => ({
        ...field,
        value: MASK,
      }));
    }
    plain.credentials = clone;
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

  private normalizeAssignee(value: unknown): string | undefined {
    if (!value) return undefined;
    return typeof value === 'string' ? value : value.toString();
  }

  private async syncEmployeeToolCounts(...employeeIds: Array<string | undefined>) {
    const uniqueIds = Array.from(
      new Set(employeeIds.filter((id): id is string => typeof id === 'string' && id.length > 0)),
    );
    if (uniqueIds.length === 0) return;

    for (const employeeId of uniqueIds) {
      const assignedToolCount = await this.toolModel.countDocuments({ assignedToId: employeeId });
      await this.connection.collection('employees').updateOne(
        { _id: new Types.ObjectId(employeeId) },
        { $set: { assignedToolCount } },
      );
    }
  }

  private async log(description: string, type: string) {
    await this.activityLogService.add({
      type,
      description,
      module: 'Tools',
      userId: 'system',
      userName: 'System',
      timestamp: new Date().toISOString(),
    });
  }
}
