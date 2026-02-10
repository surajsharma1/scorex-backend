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
  fullName?: string;
  dob?: Date;
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
  deletedAt?: Date;
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
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    otp: { type: String },
    otpExpires: { type: Date },
    friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    profilePicture: { type: String },
    bio: { type: String },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      tournamentUpdates: { type: Boolean, default: true },
      matchResults: { type: Boolean, default: true },
      systemAnnouncements: { type: Boolean, default: true },
    },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save hook
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
