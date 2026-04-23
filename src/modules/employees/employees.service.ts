import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeRole } from './employee.types';
import { ActivityLogService } from '../activity-log/activity-log.service';

interface SeedEmployee {
  name: string;
  email: string;
  password: string;
  role: EmployeeRole;
  department?: string;
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD (admin only)
  // ---------------------------------------------------------------------------

  async create(payload: CreateEmployeeDto): Promise<EmployeeDocument> {
    const email = payload.email.toLowerCase().trim();
    const exists = await this.employeeModel.exists({ email });
    if (exists) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const created = await this.employeeModel.create({
      name: payload.name.trim(),
      email,
      passwordHash,
      role: payload.role,
      department: payload.department,
      phone: payload.phone,
      avatar: payload.avatar,
      status: 'Active',
      isActive: true,
    });

    await this.log(`Onboarded employee: ${created.name} (${created.role})`, 'creation');
    return created;
  }

  async findAll(): Promise<EmployeeDocument[]> {
    // Employees directory excludes the admin account.
    return this.employeeModel
      .find({ role: { $in: ['pmo', 'dev'] } })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<EmployeeDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Employee not found');
    const doc = await this.employeeModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Employee not found');
    return doc;
  }

  async findByEmail(email: string): Promise<EmployeeDocument | null> {
    return this.employeeModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async update(id: string, payload: UpdateEmployeeDto): Promise<EmployeeDocument> {
    const update: Record<string, unknown> = { ...payload };
    if (payload.email) update.email = payload.email.toLowerCase().trim();
    if (payload.password) {
      update.passwordHash = await bcrypt.hash(payload.password, 10);
      delete update.password;
    }

    // Guard against downgrading admin role or email collisions.
    const current = await this.findById(id);
    if (current.role === 'admin' && payload.role) {
      // Admin role is not assignable via the employees endpoint.
      throw new BadRequestException('Cannot change the admin role');
    }
    if (payload.email && payload.email.toLowerCase() !== current.email) {
      const clash = await this.employeeModel.exists({ email: payload.email.toLowerCase() });
      if (clash) throw new ConflictException('Email already in use');
    }

    // Reactivation cleanup: once reactivated, clear offboarding metadata.
    const isReactivating =
      (payload.status === 'Active' && current.status === 'Inactive') ||
      (payload.isActive === true && current.isActive === false);
    if (isReactivating) {
      update.status = 'Active';
      update.isActive = true;
      update.offboardedAt = undefined;
      update.offboardNotes = undefined;
    }

    const updated = await this.employeeModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();
    if (!updated) throw new NotFoundException('Employee not found');

    await this.log(`Updated employee profile: ${updated.name}`, 'update');
    return updated;
  }

  async remove(id: string): Promise<EmployeeDocument> {
    const current = await this.findById(id);
    if (current.role === 'admin') {
      throw new BadRequestException('The admin account cannot be deleted');
    }
    const deleted = await this.employeeModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Employee not found');
    await this.log(`Deleted employee: ${deleted.name}`, 'deletion');
    return deleted;
  }

  async offboard(id: string, notes?: string): Promise<EmployeeDocument | null> {
    const employee = await this.findById(id);
    if (employee.role === 'admin') {
      throw new BadRequestException('The admin account cannot be offboarded');
    }

    // Cascade: unassign from hardware / tools / subscriptions / projects.
    await this.connection.collection('hardware').updateMany(
      { assignedToId: id },
      { $set: { assignedToId: null, status: 'Available' } },
    );
    await this.connection.collection('tools').updateMany(
      { assignedToId: id },
      { $set: { assignedToId: null } },
    );
    await this.connection.collection('subscriptions').updateMany(
      { assignedToIds: id },
      { $pull: { assignedToIds: id } } as any,
    );
    await this.connection.collection('projects').updateMany(
      {},
      { $pull: { members: { employeeId: id } } } as any,
    );
    await this.connection.collection('projects').updateMany(
      { projectManager: id },
      { $set: { projectManager: null } },
    );

    const updated = await this.employeeModel
      .findByIdAndUpdate(
        id,
        {
          status: 'Inactive',
          isActive: false,
          offboardedAt: new Date().toISOString().split('T')[0],
          offboardNotes: notes ?? undefined,
          assignedAssetCount: 0,
          assignedToolCount: 0,
          refreshTokenHash: undefined,
        },
        { new: true },
      )
      .exec();

    await this.log(`Offboarded employee: ${employee.name}`, 'update');
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Auth helpers
  // ---------------------------------------------------------------------------

  async validateCredentials(email: string, password: string): Promise<EmployeeDocument | null> {
    const employee = await this.findByEmail(email);
    if (!employee) return null;
    if (!employee.isActive || employee.status === 'Inactive') return null;
    const match = await bcrypt.compare(password, employee.passwordHash);
    return match ? employee : null;
  }

  async setRefreshTokenHash(
    id: string | Types.ObjectId,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.employeeModel
      .findByIdAndUpdate(id, { refreshTokenHash: refreshTokenHash ?? undefined })
      .exec();
  }

  sanitize(employee: EmployeeDocument): Record<string, unknown> {
    return employee.toJSON() as unknown as Record<string, unknown>;
  }

  // ---------------------------------------------------------------------------
  // Seed (admin on first boot)
  // ---------------------------------------------------------------------------

  async seedDefaults(): Promise<void> {
    const seed: SeedEmployee = {
      name: process.env.SEED_ADMIN_NAME ?? 'Rohail',
      email: (process.env.SEED_ADMIN_EMAIL ?? 'admin@assetsphere.com').toLowerCase(),
      password: process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
      role: 'admin',
      department: 'Executive',
    };

    const existing = await this.employeeModel.findOne({ email: seed.email }).exec();
    if (!existing) {
      const passwordHash = await bcrypt.hash(seed.password, 10);
      await this.employeeModel.create({
        name: seed.name,
        email: seed.email,
        passwordHash,
        role: seed.role,
        department: seed.department,
        status: 'Active',
        isActive: true,
      });
      return;
    }

    // Keep admin identity aligned with seed values.
    let dirty = false;
    if (existing.name !== seed.name) {
      existing.name = seed.name;
      dirty = true;
    }
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      dirty = true;
    }
    if (!existing.isActive) {
      existing.isActive = true;
      dirty = true;
    }
    if (existing.status !== 'Active') {
      existing.status = 'Active';
      dirty = true;
    }
    if (dirty) await existing.save();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async log(description: string, type: string): Promise<void> {
    try {
      await this.activityLogService.add({
        type,
        description,
        module: 'Employees',
        userId: 'system',
        userName: 'System',
        timestamp: new Date().toISOString(),
      });
    } catch {
      // activity log is best-effort
    }
  }
}
