const mongoose = require('mongoose');

const TrussSchema = new mongoose.Schema({
  name: String,
  width: Number,
  height: Number,
  depth: Number,
  position: {
    x: Number,
    y: Number,
    z: Number
  }
});

module.exports = mongoose.model('Truss', TrussSchema);
