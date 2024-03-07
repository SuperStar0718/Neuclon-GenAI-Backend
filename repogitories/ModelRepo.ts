import Model from "../models/Model";

export /**
 *
 *
 * @param {string} id //model id
 * @return {*}  //delete model
 */
const deleteModel = async (id: string) => {
  const response = await Model.findByIdAndDelete(id);
  return response;
};

export /**
 *
 *
 * @param {*} modelData
 * @return {*} //create new model or update existing model
 */
const saveModel = async (modelData: any) => {
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

export /**
 *
 *
 * @return {*} //find all models
 */
const getModels = async () => {
  const response = await Model.find();
  return response;
};

export /**
 *
 *
 * @param {string} id
 * @return {*} //find model by id
 */
const getModel = async (id: string) => {
  const response = await Model.findOne({ _id: id });
  return response;
};
