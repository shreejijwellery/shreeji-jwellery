import mongoose from 'mongoose';
import { USER_ROLES } from '../lib/constants';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum : Object.values(USER_ROLES) },
  permissions: { type: [String], required: false },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
