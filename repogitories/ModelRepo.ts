import Model from "../models/Model";

export const deleteModel = async (id: string) => {
  const response = await Model.findByIdAndDelete(id);
  return response;
};

export const saveModel = async (modelData: any) => {
  if (modelData._id) {
    const response = await Model.findOneAndUpdate(
      { _id: modelData._id },
      modelData,
      {
        upsert: true,
        new: true,
        useFindAndModify: false,
        timestamps: { updatedAt: true },
      }
    );
    return response;
  } else {
    const newItem = new Model(modelData);
    newItem.save().then((item) => {
      return item;
    });
  }
};

export const getModels = async () => {
    const response = await Model.find();
    return response
}

export const getModel = async (id: string) => {
    const response = await Model.findOne({ _id: id });
  return response;
};