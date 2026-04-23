import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type AccountDocument = HydratedDocument<Account>;

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
export class Account {
  @Prop({ required: true, enum: ['Gmail', 'AWS', 'Domain', 'Slack', 'GitHub', 'Figma', 'Notion', 'Other'] })
  type!: string;
  @Prop({ required: true, trim: true })
  name!: string;
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;
  @Prop({ type: SchemaTypes.Mixed, default: {} })
  credentials!: Record<string, unknown>;
  @Prop()
  ownerId?: string;
  @Prop({ default: true })
  isCompanyOwned!: boolean;
  @Prop({ default: 'Active', enum: ['Active', 'Disabled'] })
  status!: string;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
