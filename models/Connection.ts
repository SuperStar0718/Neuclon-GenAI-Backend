import mongoose from 'mongoose';
export interface IConnection{
  id: number;
  type: string;
  host: string;
  port: string;
  username: string;
  password: string;
  uri: string;
  tables: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  host: {
    type: String,
  },
  port: {
    type: String,
  },
  username: {
    type: String,
  },
  password: {
    type: String,
  },
  uri: {
    type: String,
  },
  tables: {
    type: String,
  },
  status: {
    type: String,
    required: true,
  },
}, { timestamps: true});

ConnectionSchema.index({ updatedAt: 1 }); // 1 for ascending order, -1 for descending order

export default mongoose.model<IConnection>('connections', ConnectionSchema);
