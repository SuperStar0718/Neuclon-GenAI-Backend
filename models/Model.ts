import mongoose from 'mongoose';


interface IModel {
  id: number;
  name: string;
  host: string;
  nodeData: string;
  diagramData: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;

}
const ModelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    host: {
      type: String,
    },
    nodeData: {
      type: String,
    },
    diagramData: {
      type: String,
    },
    description:{
      type:String,
    }
  },
  { timestamps: true }
);

export default mongoose.model<IModel>('models', ModelSchema);
