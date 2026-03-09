/**
 * Club Model
 * Club management system
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

// ==========================================
// INTERFACES
// ==========================================

export interface IClub extends Document {
  // Basic Info
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  
  // Owner & Management
  owner: mongoose.Types.ObjectId;
  viceLeaders: mongoose.Types.ObjectId[];
  
  // Members
  members: mongoose.Types.ObjectId[];
  memberRoles: Map<string, 'owner' | 'vice-leader' | 'member'>;
  
  // Join Configuration
  type: 'public' | 'initiation_required';
  joinRequests: mongoose.Types.ObjectId[];
  
  // Location
  location?: string;
  
  // Status
  isActive: boolean;
  
  // Statistics
  memberCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addMember(userId: mongoose.Types.ObjectId): Promise<void>;
  removeMember(userId: mongoose.Types.ObjectId): Promise<void>;
  join(userId: mongoose.Types.ObjectId): Promise<void>;
  leave(userId: mongoose.Types.ObjectId): Promise<void>;
  approveJoinRequest(userId: mongoose.Types.ObjectId): Promise<void>;
}

// ==========================================
// MAIN SCHEMA
// ==========================================

const ClubSchema: Schema = new Schema({
  // Basic Info
  name: { 
    type: String, 
    required: [true, 'Club name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: { 
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  logo: { type: String },
  banner: { type: String },
  
  // Owner & Management
  owner: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'Club owner is required']
  },
  viceLeaders: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Members
  members: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  memberRoles: {
    type: Map,
    of: String,
    default: new Map()
  },
  
  // Join Configuration
  type: { 
    type: String, 
    enum: ['public', 'initiation_required'],
    default: 'public'
  },
  joinRequests: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  
  // Location
  location: { type: String },
  
  // Status
  isActive: { type: Boolean, default: true },
  
  // Statistics
  memberCount: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// INDEXES
// ==========================================

ClubSchema.index({ name: 'text' });
ClubSchema.index({ owner: 1 });
ClubSchema.index({ members: 1 });
ClubSchema.index({ type: 1 });
ClubSchema.index({ isActive: 1 });

// ==========================================
// METHODS
// ==========================================

// Add member
ClubSchema.methods.addMember = async function(userId: mongoose.Types.ObjectId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.memberCount = this.members.length;
    await this.save();
  }
};

// Remove member
ClubSchema.methods.removeMember = async function(userId: mongoose.Types.ObjectId) {
  this.members = this.members.filter(
    m => m.toString() !== userId.toString()
  );
  this.memberRoles.delete(userId.toString());
  this.memberCount = this.members.length;
  await this.save();
};

// Join club
ClubSchema.methods.join = async function(userId: mongoose.Types.ObjectId) {
  if (this.members.includes(userId)) {
    throw new Error('Already a member');
  }
  
  if (this.type === 'initiation_required') {
    if (!this.joinRequests.includes(userId)) {
      this.joinRequests.push(userId);
      await this.save();
    }
    throw new Error('Join request sent for approval');
  }
  
  await this.addMember(userId);
};

// Leave club
ClubSchema.methods.leave = async function(userId: mongoose.Types.ObjectId) {
  if (this.owner.toString() === userId.toString()) {
    throw new Error('Owner cannot leave club. Transfer ownership first.');
  }
  
  await this.removeMember(userId);
};

// Approve join request
ClubSchema.methods.approveJoinRequest = async function(userId: mongoose.Types.ObjectId) {
  this.joinRequests = this.joinRequests.filter(
    r => r.toString() !== userId.toString()
  );
  await this.addMember(userId);
};

// ==========================================
// STATIC METHODS
// ==========================================

ClubSchema.statics.getPublic = function() {
  return this.find({ type: 'public', isActive: true })
    .populate('owner', 'username email');
};

ClubSchema.statics.getUserClubs = function(userId: mongoose.Types.ObjectId) {
  return this.find({ 
    members: userId,
    isActive: true 
  });
};

// ==========================================
// EXPORT
// ==========================================

export default mongoose.model<IClub>('Club', ClubSchema);

