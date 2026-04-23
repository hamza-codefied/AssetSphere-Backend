import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type HardwareDocument = HydratedDocument<Hardware>;

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
export class Hardware {
  @Prop({ required: true, trim: true })
  name!: string;
  @Prop({ required: true, trim: true })
  type!: string;
  @Prop({ required: true, unique: true, trim: true })
  serialNumber!: string;
  @Prop({ default: 'Available', enum: ['Available', 'Assigned', 'Inactive'] })
  status!: string;
  @Prop()
  assignedToId?: string;
  @Prop({ type: SchemaTypes.Mixed })
  credentials?: Record<string, unknown>;
  @Prop()
  notes?: string;
}

export const HardwareSchema = SchemaFactory.createForClass(Hardware);
