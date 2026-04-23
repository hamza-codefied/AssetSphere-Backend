import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type ProjectDocument = HydratedDocument<Project>;

@Schema({ _id: false })
class ProjectMember {
  @Prop({ required: true })
  employeeId!: string;
  @Prop({ required: true })
  role!: string;
}

@Schema({ _id: false })
class StandaloneCredential {
  @Prop({ required: true })
  id!: string;
  @Prop({ required: true })
  label!: string;
  @Prop()
  username?: string;
  @Prop({ type: SchemaTypes.Mixed })
  password?: Record<string, unknown>;
  @Prop()
  url?: string;
  @Prop()
  notes?: string;
  @Prop({ required: true })
  lastUpdated!: string;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      if (ret._id) ret.id = ret._id?.toString?.() ?? ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      if (ret._id) ret.id = ret._id?.toString?.() ?? ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Project {
  @Prop({ required: true, trim: true })
  name!: string;
  @Prop({ required: true, trim: true })
  clientName!: string;
  @Prop()
  description?: string;
  @Prop({ default: 'Active', enum: ['Active', 'Archived', 'Completed'] })
  status!: string;
  @Prop({ required: true })
  startDate!: string;
  @Prop()
  endDate?: string;
  @Prop()
  projectManager?: string;
  @Prop({ type: [ProjectMember], default: [] })
  members!: ProjectMember[];
  @Prop({ type: [String], default: [] })
  linkedAccountIds!: string[];
  @Prop({ type: [String], default: [] })
  hardwareIds!: string[];
  @Prop({ type: [String], default: [] })
  subscriptionIds!: string[];
  @Prop({ type: [StandaloneCredential], default: [] })
  standaloneCredentials!: StandaloneCredential[];
  @Prop()
  notes?: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
