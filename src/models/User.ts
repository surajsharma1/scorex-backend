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

interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  googleId?: string;
  githubId?: string;
  role: UserRole;
  membership: {
    level: MembershipLevel;
    expires: Date;
    paymentId?: string;
  };
  avatar?: string;
  verified: boolean;
  lastLogin: Date;
  preferences: {
    notifications: boolean;
    darkMode: boolean;
    language: string;
  };

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isMembershipActive(): boolean;
  hasPermission(permission: string): boolean;
}

const UserSchema = new Schema<IUser>({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
  password: { type: String, minlength: 6, select: false },
  googleId: { type: String },
  githubId: { type: String },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.VIEWER },
  membership: {
    level: { type: Number, enum: Object.values(MembershipLevel), default: MembershipLevel.FREE },
    expires: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    paymentId: String
  },
  avatar: { type: String, default: '/default-avatar.png' },
  verified: { type: Boolean, default: false },
  lastLogin: { type: Date, default: Date.now },
  preferences: {
    notifications: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' }
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

// Check active membership
UserSchema.methods.isMembershipActive = function(): boolean {
  return this.membership.level > MembershipLevel.FREE && 
         new Date() < new Date(this.membership.expires);
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

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
export default User;

