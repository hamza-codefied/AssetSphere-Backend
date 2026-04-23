import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

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
export class Subscription {
  @Prop({ required: true, trim: true })
  name!: string;
  @Prop({ required: true, trim: true })
  vendor!: string;
  @Prop({ required: true, enum: ['SaaS', 'License', 'Cloud', 'Vendor', 'Other'] })
  type!: string;
  @Prop({ required: true })
  cost!: number;
  @Prop({ required: true, enum: ['Monthly', 'Quarterly', 'Annual', 'One-Time'] })
  billingCycle!: string;
  @Prop({ required: true })
  purchaseDate!: string;
  @Prop({ required: true })
  renewalDate!: string;
  @Prop({ default: 'Active', enum: ['Active', 'Expiring Soon', 'Expired', 'Cancelled'] })
  status!: string;
  @Prop({ default: 'Company-Wide', enum: ['Individual', 'Team', 'Company-Wide'] })
  assignmentScope!: string;
  @Prop({ type: [String], default: [] })
  assignedToIds!: string[];
  @Prop()
  teamName?: string;
  @Prop()
  linkedAccountId?: string;
  @Prop({ type: SchemaTypes.Mixed })
  credentials?: Record<string, unknown>;
  @Prop()
  licenseCount?: number;
  @Prop()
  notes?: string;
  @Prop({ type: [Number], default: [30, 7, 1] })
  alertDays!: number[];
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
