import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityDocument = HydratedDocument<Activity>;

@Schema({ timestamps: true })
export class Activity {
  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  userName!: string;

  @Prop({ required: true })
  module!: string;

  @Prop({ required: true })
  timestamp!: string;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);
