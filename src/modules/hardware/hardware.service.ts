import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { EncryptedValue } from '../../common/crypto/crypto.types';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EmployeesService } from '../employees/employees.service';
import { AssignHardwareDto } from './dto/assign-hardware.dto';
import { CreateHardwareDto } from './dto/create-hardware.dto';
import { UpdateHardwareDto } from './dto/update-hardware.dto';
import { Hardware, HardwareDocument } from './schemas/hardware.schema';

const MASK = '********';

@Injectable()
export class HardwareService {
  constructor(
    @InjectModel(Hardware.name) private readonly hardwareModel: Model<HardwareDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly employeesService: EmployeesService,
    private readonly activityLogService: ActivityLogService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(payload: CreateHardwareDto) {
    const serial = (payload.serialNumber?.trim() || this.generateSerial()).toUpperCase();
    await this.assertSerialAvailable(serial);

    const assignedToId = await this.resolveAssignee(payload.assignedToId);
    const status = assignedToId ? 'Assigned' : payload.status ?? 'Available';

    const created = await this.hardwareModel.create({
      name: payload.name.trim(),
      type: payload.type.trim(),
      serialNumber: serial,
      assignedToId,
      status,
      credentials: this.encryptCredentials(payload.credentials as unknown as Record<string, unknown> | undefined),
      notes: payload.notes?.trim() || undefined,
    });

    await this.syncEmployeeAssetCounts(assignedToId);
    await this.log(`Added new hardware: ${created.name}`, 'creation');
    return this.masked(created);
  }

  async findAll() {
    const list = await this.hardwareModel.find().sort({ createdAt: -1 }).exec();
    return list.map((item) => this.masked(item));
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Hardware not found');
    const doc = await this.hardwareModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Hardware not found');
    return doc;
  }

  async update(id: string, payload: UpdateHardwareDto) {
    const current = await this.findById(id);
    const previousAssigneeId = this.normalizeAssignee(current.assignedToId);

    const update: Record<string, unknown> = {};
    if (typeof payload.name === 'string') update.name = payload.name.trim();
    if (typeof payload.type === 'string') update.type = payload.type.trim();
    if (typeof payload.notes === 'string') update.notes = payload.notes.trim();

    if (typeof payload.serialNumber === 'string') {
      const serial = payload.serialNumber.trim().toUpperCase();
      if (serial && serial !== current.serialNumber) {
        await this.assertSerialAvailable(serial, id);
        update.serialNumber = serial;
      }
    }

    if (payload.credentials) {
      update.credentials = this.encryptCredentials(
        payload.credentials as unknown as Record<string, unknown>,
        current.credentials as Record<string, unknown> | undefined,
      );
    }

    if (payload.assignedToId !== undefined) {
      const assignedToId = await this.resolveAssignee(payload.assignedToId);
      update.assignedToId = assignedToId;
      update.status = assignedToId ? 'Assigned' : 'Available';
    } else if (payload.status) {
      update.status = payload.status;
      if (payload.status !== 'Assigned') update.assignedToId = undefined;
    }

    const updated = await this.hardwareModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Hardware not found');

    await this.syncEmployeeAssetCounts(previousAssigneeId, this.normalizeAssignee(updated.assignedToId));
    await this.log(`Updated hardware: ${updated.name}`, 'update');
    return this.masked(updated);
  }

  async assign(id: string, payload: AssignHardwareDto) {
    const hardware = await this.findById(id);
    const previousAssigneeId = this.normalizeAssignee(hardware.assignedToId);
    const assignedToId = await this.resolveAssignee(payload.assignedToId);

    const updated = await this.hardwareModel
      .findByIdAndUpdate(
        id,
        {
          assignedToId,
          status: assignedToId ? 'Assigned' : 'Available',
        },
        { new: true },
      )
      .exec();

    if (!updated) throw new NotFoundException('Hardware not found');

    await this.syncEmployeeAssetCounts(previousAssigneeId, this.normalizeAssignee(updated.assignedToId));
    const action = assignedToId ? `Assigned hardware: ${hardware.name}` : `Unassigned hardware: ${hardware.name}`;
    await this.log(action, 'assignment');
    return this.masked(updated);
  }

  async remove(id: string) {
    const deleted = await this.hardwareModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Hardware not found');
    await this.syncEmployeeAssetCounts(this.normalizeAssignee(deleted.assignedToId));
    await this.log(`Removed hardware: ${deleted.name}`, 'deletion');
    return this.masked(deleted);
  }

  private async assertSerialAvailable(serialNumber: string, ignoreId?: string) {
    const existing = await this.hardwareModel.findOne({ serialNumber }).select('_id').lean().exec();
    if (!existing) return;
    if (ignoreId && existing._id?.toString() === ignoreId) return;
    throw new ConflictException('Serial number already in use');
  }

  private async resolveAssignee(assignedToId?: string | null): Promise<string | undefined> {
    if (!assignedToId) return undefined;

    const employee = await this.employeesService.findById(assignedToId);
    if (employee.role === 'admin') {
      throw new BadRequestException('Admin cannot be assigned hardware');
    }
    if (!employee.isActive || employee.status === 'Inactive') {
      throw new BadRequestException('Cannot assign hardware to an inactive employee');
    }

    return assignedToId;
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

    if (typeof result.pin === 'string' && result.pin && result.pin !== MASK) {
      result.pin = this.cryptoService.encrypt(result.pin);
    }

    return result;
  }

  private masked(hardware: HardwareDocument): Record<string, unknown> {
    const data = hardware.toJSON() as unknown as Record<string, unknown>;
    const credentials = data.credentials as Record<string, unknown> | undefined;
    if (!credentials) return data;

    const clone = { ...credentials };
    if (this.isEncryptedValue(clone.password)) clone.password = MASK;
    if (this.isEncryptedValue(clone.pin)) clone.pin = MASK;

    data.credentials = clone;
    return data;
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

  private generateSerial(): string {
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `HW-${suffix}`;
  }

  private normalizeAssignee(value: unknown): string | undefined {
    if (!value) return undefined;
    return typeof value === 'string' ? value : value.toString();
  }

  private async syncEmployeeAssetCounts(...employeeIds: Array<string | undefined>) {
    const uniqueIds = Array.from(
      new Set(employeeIds.filter((id): id is string => typeof id === 'string' && id.length > 0)),
    );
    if (uniqueIds.length === 0) return;

    for (const employeeId of uniqueIds) {
      const assignedAssetCount = await this.hardwareModel.countDocuments({
        assignedToId: employeeId,
        status: 'Assigned',
      });
      await this.connection.collection('employees').updateOne(
        { _id: new Types.ObjectId(employeeId) },
        { $set: { assignedAssetCount } },
      );
    }
  }

  private async log(description: string, type: string) {
    await this.activityLogService.add({
      type,
      description,
      module: 'Hardware',
      userId: 'system',
      userName: 'System',
      timestamp: new Date().toISOString(),
    });
  }
}
