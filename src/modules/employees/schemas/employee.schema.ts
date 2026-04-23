import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

const publicTransform = (_doc: unknown, ret: Record<string, any>) => {
  if (ret._id) ret.id = ret._id?.toString?.() ?? ret._id;
  delete ret._id;
  delete ret.__v;
  delete ret.passwordHash;
  delete ret.refreshTokenHash;
  return ret;
};

@Schema({
  timestamps: true,
  toJSON: { virtuals: true, transform: publicTransform },
  toObject: { virtuals: true, transform: publicTransform },
})
export class Employee {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, enum: ['admin', 'pmo', 'dev'], default: 'dev' })
  role!: 'admin' | 'pmo' | 'dev';

  @Prop()
  department?: string;

  @Prop()
  phone?: string;

  @Prop()
  avatar?: string;

  @Prop({ enum: ['Active', 'Inactive'], default: 'Active' })
  status!: 'Active' | 'Inactive';

  @Prop()
  offboardedAt?: string;

  @Prop()
  offboardNotes?: string;

  @Prop({ default: 0 })
  assignedAssetCount!: number;

  @Prop({ default: 0 })
  assignedToolCount!: number;

  @Prop()
  refreshTokenHash?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
