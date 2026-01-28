  import mongoose, { Document, Schema } from 'mongoose';

  export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    message: string;
    type: 'info' | 'warning' | 'success';
    read: boolean;
  }

  const notificationSchema = new Schema<INotification>(
    {
      user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      message: { type: String, required: true },
      type: { type: String, enum: ['info', 'warning', 'success'], default: 'info' },
      read: { type: Boolean, default: false },
    },
    { timestamps: true }
  );

  export default mongoose.model<INotification>('Notification', notificationSchema);