/**
 * User Model
 * Complete user authentication and profile management
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ==========================================
// INTERFACES
// ==========================================

export interface IUser extends Document {
  // Core Authentication
  username: string;
  email: string;
  password?: string;
  role: 'viewer' | 'organizer' | 'admin';
  
  // Membership System (0=Free, 1=Basic, 2=Premium)
  membershipLevel: 0 | 1 | 2;
  membershipExpiresAt?: Date;
  membershipStartedAt?: Date;
  
  // Membership Timeline - History of all membership status changes
  membershipTimeline?: {
    level: number;
    status: 'active' | 'expired' | 'upgraded' | 'downgraded' | 'cancelled';
    startedAt: Date;
    endedAt?: Date;
    paymentId?: string;
    notes?: string;
  }[];
  
  // Auth & Verification
  otp?: string;
  otpExpires?: Date;
  isVerified: boolean;

  // Social Login
  googleId?: string;
  githubId?: string;

  // Profile Info
  fullName?: string;
  dob?: Date;
  friends: mongoose.Types.ObjectId[];
  profilePicture?: string;
  bio?: string;
  
  // Notification Preferences
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
    tournamentUpdates: boolean;
    matchResults: boolean;
    systemAnnouncements: boolean;
  };
  
  // Payment History
  paymentHistory?: {
    amount: number;
    currency: string;
    level: string;
    duration: string;
    paymentIntentId: string;
    status: string;
    date: Date;
  }[];
  
  // Soft Delete
  deleted: boolean;
  deletedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isMembershipActive(): boolean;
}

// ==========================================
// SCHEMA
// ==========================================

const UserSchema: Schema = new Schema({
  // Core Authentication
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Never return password in queries by default
  },
  
  // Role Management
  role: { 
    type: String, 
    enum: ['viewer', 'organizer', 'admin'], 
    default: 'viewer' 
  },
  
  // Membership System
  membershipLevel: { 
    type: Number, 
    default: 0, 
    enum: [0, 1, 2],
    validate: {
      validator: function(value: number) {
        return [0, 1, 2].includes(value);
      },
      message: 'Membership level must be 0 (Free), 1 (Basic), or 2 (Premium)'
    }
  },
  membershipExpiresAt: { type: Date },
  membershipStartedAt: { type: Date },

  // Membership Timeline
  membershipTimeline: [{
    level: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ['active', 'expired', 'upgraded', 'downgraded', 'cancelled'], 
      default: 'active' 
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    paymentId: { type: String },
    notes: { type: String }
  }],

  // Verification Fields
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },
  isVerified: { type: Boolean, default: false },

  // Social Login
  googleId: { type: String, unique: true, sparse: true },
  githubId: { type: String, unique: true, sparse: true },

  // Profile Info
  fullName: { type: String, trim: true },
  dob: { type: Date },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  profilePicture: { type: String },
  bio: { type: String, maxlength: 500 },
  
  // Notification Preferences
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    tournamentUpdates: { type: Boolean, default: true },
    matchResults: { type: Boolean, default: true },
    systemAnnouncements: { type: Boolean, default: true },
  },
  
  // Payment History
  paymentHistory: [{
    amount: { type: Number },
    currency: { type: String, default: 'USD' },
    level: { type: String },
    duration: { type: String },
    paymentIntentId: { type: String },
    status: { type: String },
    date: { type: Date, default: Date.now }
  }],
  
  // Soft Delete
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// INDEXES
// ==========================================

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ githubId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ membershipLevel: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ deleted: 1 });

// ==========================================
// VIRTUALS
// ==========================================

// Virtual for getting user's membership status
UserSchema.virtual('isMembershipActive').get(function() {
  if (!this.membershipExpiresAt) return false;
  return new Date() < this.membershipExpiresAt;
});

// Virtual for time remaining in membership
UserSchema.virtual('membershipTimeRemaining').get(function() {
  if (!this.membershipExpiresAt) return null;
  const now = new Date();
  const diff = this.membershipExpiresAt.getTime() - now.getTime();
  if (diff <= 0) return null;
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(days / 30);
  
  return { days, months, milliseconds: diff };
});

// Virtual for friend count
UserSchema.virtual('friendCount').get(function() {
  return this.friends ? this.friends.length : 0;
});

// ==========================================
// PRE-SAVE HOOKS
// ==========================================

// Hash password before saving
UserSchema.pre('save', async function(next) {
  // Only hash if password is modified and exists
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(12); // Increased salt rounds for security
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Normalize email before saving
UserSchema.pre('save', function(next) {
  if (this.isModified('email') && this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  if (this.isModified('username') && this.username) {
    this.username = this.username.trim();
  }
  next();
});

// ==========================================
// METHODS
// ==========================================

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if membership is active
UserSchema.methods.isMembershipActive = function(): boolean {
  if (!this.membershipExpiresAt) return false;
  return new Date() < this.membershipExpiresAt;
};

// Check if user can access premium features
UserSchema.methods.canAccessPremium = function(): boolean {
  return this.isMembershipActive() && this.membershipLevel >= 2;
};

// Check if user can access basic features
UserSchema.methods.canAccessBasic = function(): boolean {
  return this.isMembershipActive() && this.membershipLevel >= 1;
};

// Add payment to history
UserSchema.methods.addPayment = function(payment: {
  amount: number;
  currency?: string;
  level: string;
  duration: string;
  paymentIntentId: string;
  status: string;
}) {
  if (!this.paymentHistory) {
    this.paymentHistory = [];
  }
  
  this.paymentHistory.push({
    amount: payment.amount,
    currency: payment.currency || 'USD',
    level: payment.level,
    duration: payment.duration,
    paymentIntentId: payment.paymentIntentId,
    status: payment.status,
    date: new Date()
  });
};

// Update membership
UserSchema.methods.updateMembership = function(level: 0 | 1 | 2, durationMonths: number) {
  const now = new Date();
  const newEndDate = new Date(now);
  newEndDate.setMonth(newEndDate.getMonth() + durationMonths);
  
  // Add to timeline
  if (!this.membershipTimeline) {
    this.membershipTimeline = [];
  }
  
  // End current membership if exists
  if (this.membershipExpiresAt && this.membershipExpiresAt > now) {
    const currentLevel = this.membershipLevel;
    this.membershipTimeline.push({
      level: currentLevel,
      status: level > currentLevel ? 'upgraded' : level < currentLevel ? 'downgraded' : 'cancelled',
      startedAt: this.membershipStartedAt || now,
      endedAt: now
    });
  }
  
  // Set new membership
  this.membershipLevel = level;
  this.membershipStartedAt = now;
  this.membershipExpiresAt = newEndDate;
  
  this.membershipTimeline.push({
    level,
    status: 'active',
    startedAt: now,
    paymentId: `MEM-${Date.now()}`
  });
};

// Soft delete
UserSchema.methods.softDelete = function() {
  this.deleted = true;
  this.deletedAt = new Date();
  // Clear sensitive data
  this.password = undefined;
  this.otp = undefined;
  this.otpExpires = undefined;
};

// ==========================================
// STATIC METHODS
// ==========================================

// Find by email
UserSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Find active users
UserSchema.statics.findActive = function() {
  return this.find({ deleted: false });
};

// Find users by role
UserSchema.statics.findByRole = function(role: string) {
  return this.find({ role, deleted: false });
};

// Get users with expiring membership
UserSchema.statics.getExpiringMembership = function(days: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    membershipExpiresAt: { $lte: futureDate, $gt: new Date() },
    deleted: false
  });
};

// ==========================================
// EXPORT
// ==========================================

export default mongoose.model<IUser>('User', UserSchema);

