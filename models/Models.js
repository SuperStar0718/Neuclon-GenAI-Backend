const mongoose = require("mongoose");

const ModelSchema = new mongoose.Schema({
 
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

  updated_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = Model = mongoose.model("models", ModelSchema);
