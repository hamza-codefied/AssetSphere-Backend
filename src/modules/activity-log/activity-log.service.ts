import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(Activity.name) private readonly activityModel: Model<ActivityDocument>,
  ) {}

  async add(payload: Omit<Activity, keyof { _id: unknown }>): Promise<ActivityDocument> {
    return this.activityModel.create(payload);
  }

  async findAll(module?: string, limit = 20): Promise<ActivityDocument[]> {
    const query = module ? { module } : {};
    return this.activityModel.find(query).sort({ timestamp: -1 }).limit(limit).exec();
  }
}
