const mongoose = require("mongoose");

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

module.exports = Connection = mongoose.model("connections", ConnectionSchema);
