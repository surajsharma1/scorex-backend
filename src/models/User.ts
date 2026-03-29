import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  ADMIN = 'admin',
  ORGANIZER = 'organizer',
  VIEWER = 'viewer'
}

export enum MembershipLevel {
  FREE = 0,
  PREMIUM = 1,
  ENTERPRISE = 2
}

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  githubId?: string;
  fullName?: string;
  role: UserRole;
  membershipLevel: 0 | 1 | 2;
  membershipStartedAt?: Date;
  membershipExpiresAt?: Date;
  membershipTimeline: Array<{
    level: number;
    status: string;
    startedAt: Date;
    endedAt?: Date;
    notes?: string;
    paymentId?: string;
  }>;
    paymentHistory: Array<{
    amount: number;
    currency: string;
    plan: string;
    duration?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    paymentIntentId?: string;
    status: string;
    date: Date;
    notes?: string;
  }>;
  avatar?: string;
  verified: boolean;
  lastLogin: Date;
  preferences: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
  };
  banned?: {
    until: Date;
    reason?: string;
    bannedBy: string;
    duration: string;
  };

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isMembershipActive(): boolean;
  hasPermission(permission: string): boolean;
  isBanned(): boolean;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, minlength: 6, select: false },
  googleId: { type: String },
  githubId: { type: String },
  fullName: { type: String, trim: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.VIEWER },
  membershipLevel: { 
    type: Number, 
    enum: [0, 1, 2], 
    default: 0 
  },
  membershipStartedAt: { type: Date },
  membershipExpiresAt: { type: Date },
  membershipTimeline: [{
    level: { type: Number, required: true },
    status: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    notes: String,
    paymentId: String
  }],
  paymentHistory: [{amount: Number,   currency: { type: String, default: 'INR' },    plan: String,    duration: String,    razorpay_order_id: String,    razorpay_payment_id: String,    status: String ,    date: { type: Date, default: Date.now },    notes: String  }],
  avatar: { type: String, default: '/default-avatar.png' },
  verified: { type: Boolean, default: false },
  lastLogin: { type: Date, default: Date.now },
  preferences: {
    notifications: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' }
  },
  banned: {
    until: { type: Date },
    reason: String,
    bannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    duration: String
  }
}, {
  timestamps: true
});

// Password hashing
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password!, 12);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password || '');
};

// Check active membership - Updated for flat fields
UserSchema.methods.isMembershipActive = function(): boolean {
  return this.membershipLevel > 0 && 
         (!this.membershipExpiresAt || new Date() < new Date(this.membershipExpiresAt));
};

// Permission check
UserSchema.methods.hasPermission = function(permission: string): boolean {
  const rolePermissions: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: ['*'],
    [UserRole.ORGANIZER]: ['tournament:*', 'match:score', 'team:*'],
    [UserRole.VIEWER]: ['read:*']
  };
  return rolePermissions[this.role as UserRole].some(p => 
    permission === p || p === '*' || permission.startsWith(p.replace('*', ''))
  );
};

UserSchema.methods.isBanned = function(): boolean {
  if (!this.banned || !this.banned.until) return false;
  return new Date() < new Date(this.banned.until);
};

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;

