import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  username: string;
  email: string;
  password?: string;
  role: 'viewer' | 'organizer' | 'admin';
  membershipLevel: 0 | 1 | 2; // 0=Free, 1=Basic (Static), 2=Premium (Animated)
  membershipExpiresAt?: Date;
  
  // Auth & Verification Fields
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
  
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    sms: boolean;
    tournamentUpdates: boolean;
    matchResults: boolean;
    systemAnnouncements: boolean;
  };
  
  // FIXED: Changed to an array of objects to match the Schema definition
  paymentHistory?: {
    amount: number;
    currency: string;
    level: string;
    duration: string;
    paymentIntentId: string;
    status: string;
    date: Date;
  }[];
  
  deleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
    
    role: { type: String, enum: ['viewer', 'organizer', 'admin'], default: 'viewer' },
    
    membershipLevel: { type: Number, default: 0, enum: [0, 1, 2] },
    membershipExpiresAt: { type: Date },

    // Verification Fields (Critical for OTP)
    otp: { type: String, select: false }, // Select false means it won't be returned in queries unless requested
    otpExpires: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },

    // Socials
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },

    fullName: { type: String },
    dob: { type: Date },
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
    
    paymentHistory: [{
      amount: { type: Number },
      currency: { type: String },
      level: { type: String },
      duration: { type: String },
      paymentIntentId: { type: String },
      status: { type: String },
      date: { type: Date, default: Date.now }
    }],
    
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Method to check password
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  // If password is not selected (select: false), we cannot compare. 
  // Ensure your controller does .select('+password') if using this method on a query result that hid it.
  if (!this.password) return false; 
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);