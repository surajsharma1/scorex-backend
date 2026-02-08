import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  role: 'viewer' | 'organizer' | 'admin';
  membership: 'free' | 'premium' | 'pro';
  googleId?: string;
  githubId?: string;
  otp?: string;
  otpExpires?: Date;
  friends: mongoose.Types.ObjectId[];
  profilePicture?: string;
  bio?: string;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
    tournamentUpdates: boolean;
    matchResults: boolean;
    systemAnnouncements: boolean;
  };
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, enum: ['viewer', 'organizer', 'admin'], default: 'viewer' },
    membership: { type: String, enum: ['free', 'premium', 'pro'], default: 'free' },
    googleId: { type: String, sparse: true },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      tournamentUpdates: { type: Boolean, default: true },
      matchResults: { type: Boolean, default: true },
      systemAnnouncements: { type: Boolean, default: true },
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);