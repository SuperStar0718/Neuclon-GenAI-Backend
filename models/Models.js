const mongoose = require("mongoose");

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
  },
  { timestamps: true }
);

module.exports = Model = mongoose.model("models", ModelSchema);
