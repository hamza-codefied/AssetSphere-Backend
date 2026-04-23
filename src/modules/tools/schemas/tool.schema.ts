import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type ToolDocument = HydratedDocument<Tool>;

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
export class Tool {
  @Prop({ required: true, trim: true })
  name!: string;
  @Prop()
  linkedAccountId?: string;
  @Prop()
  assignedToId?: string;
  @Prop()
  expiryDate?: string;
  @Prop({ default: 'Active', enum: ['Active', 'Expired'] })
  status!: string;
  @Prop({ type: SchemaTypes.Mixed })
  credentials?: Record<string, unknown>;
}

export const ToolSchema = SchemaFactory.createForClass(Tool);
