import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EmployeesService } from '../employees/employees.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { EncryptedValue } from '../../common/crypto/crypto.types';

const MASK = '********';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly employeesService: EmployeesService,
    private readonly cryptoService: CryptoService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(payload: CreateProjectDto) {
    await this.validateRelations(payload);
    const created = await this.projectModel.create(
      this.encryptCredentials({
        ...payload,
        name: payload.name.trim(),
        clientName: payload.clientName.trim(),
        description: payload.description?.trim(),
        notes: payload.notes?.trim(),
      } as unknown as Record<string, unknown>),
    );
    await this.log(`Created project: ${created.name}`, 'creation');
    return this.mask(created);
  }

  async findAll() {
    const docs = await this.projectModel.find().sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.mask(doc));
  }

  async update(id: string, payload: UpdateProjectDto) {
    await this.validateRelations(payload);
    const updated = await this.projectModel
      .findByIdAndUpdate(id, this.encryptCredentials(payload as unknown as Record<string, unknown>), { new: true })
      .exec();
    if (!updated) throw new NotFoundException('Project not found');
    await this.log(`Updated project: ${updated.name}`, 'update');
    return this.mask(updated);
  }

  async updateMembers(id: string, members: Array<{ employeeId: string; role: string }>) {
    await this.validateRelations({ members });
    return this.update(id, { members } as never);
  }

  async addCredential(id: string, credential: Record<string, unknown>) {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');
    const encrypted = { ...credential } as Record<string, unknown>;
    if (typeof encrypted.password === 'string') {
      encrypted.password = this.cryptoService.encrypt(encrypted.password);
    }
    project.standaloneCredentials = [...project.standaloneCredentials, encrypted as never];
    await project.save();
    return this.mask(project);
  }

  async remove(id: string) {
    const deleted = await this.projectModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Project not found');
    await this.log(`Deleted project: ${deleted.name}`, 'deletion');
    return this.mask(deleted);
  }

  private encryptCredentials(payload: Record<string, unknown>) {
    if (!payload.standaloneCredentials) return payload;
    const standaloneCredentials = (payload.standaloneCredentials as Array<Record<string, unknown>>).map((credential) => {
      const next = { ...credential } as Record<string, unknown>;
      if (typeof next.password === 'string' && next.password && next.password !== MASK) {
        next.password = this.cryptoService.encrypt(next.password);
      }
      return next;
    });
    return { ...payload, standaloneCredentials };
  }

  private mask(doc: ProjectDocument) {
    const plain = doc.toObject() as any;
    if (Array.isArray(plain.standaloneCredentials)) {
      plain.standaloneCredentials = plain.standaloneCredentials.map((credential: any) => ({
        ...credential,
        password: this.isEncryptedValue(credential.password) ? MASK : credential.password,
      }));
    }
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

  private async validateRelations(payload: {
    projectManager?: string;
    members?: Array<{ employeeId: string }>;
    linkedAccountIds?: string[];
    hardwareIds?: string[];
    subscriptionIds?: string[];
  }) {
    const employeeIds = new Set<string>();
    if (payload.projectManager) employeeIds.add(payload.projectManager);
    if (Array.isArray(payload.members)) payload.members.forEach((m) => employeeIds.add(m.employeeId));

    for (const employeeId of employeeIds) {
      const employee = await this.employeesService.findById(employeeId);
      if (employee.role === 'admin') throw new BadRequestException('Admin cannot be assigned to projects');
      if (!employee.isActive || employee.status === 'Inactive') {
        throw new BadRequestException('Cannot assign inactive employee to project');
      }
    }

    if (payload.projectManager) {
      const manager = await this.employeesService.findById(payload.projectManager);
      if (manager.role !== 'pmo') {
        throw new BadRequestException('Project manager must have PMO role');
      }
      if (payload.members?.some((member) => member.employeeId === payload.projectManager)) {
        throw new BadRequestException('Project manager cannot be added as a team member');
      }
    }

    await this.assertCollectionIdsExist('accounts', payload.linkedAccountIds);
    await this.assertCollectionIdsExist('hardware', payload.hardwareIds);
    await this.assertCollectionIdsExist('subscriptions', payload.subscriptionIds);
  }

  private async assertCollectionIdsExist(collection: string, ids?: string[]) {
    if (!ids || ids.length === 0) return;
    const collectionCandidates =
      collection === 'hardware' ? ['hardware', 'hardwares'] : [collection];
    const entityLabelMap: Record<string, string> = {
      accounts: 'account',
      hardware: 'hardware',
      subscriptions: 'subscription',
    };
    const entityLabel = entityLabelMap[collection] ?? collection;

    for (const id of ids) {
      if (!Types.ObjectId.isValid(id)) throw new BadRequestException(`Invalid ${entityLabel} id`);

      let exists = null;
      for (const candidate of collectionCandidates) {
        exists = await this.connection
          .collection(candidate)
          .findOne({ _id: new Types.ObjectId(id) });
        if (exists) break;
      }

      if (!exists) throw new BadRequestException(`${entityLabel} not found`);
    }
  }

  private async log(description: string, type: string) {
    await this.activityLogService.add({
      type,
      description,
      module: 'Projects',
      userId: 'system',
      userName: 'System',
      timestamp: new Date().toISOString(),
    });
  }
}
