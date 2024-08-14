const express = require('express');
const router = express.Router();
const Truss = require('../models/Truss');

// Get all trusses
router.get('/', async (req, res) => {
  const trusses = await Truss.find();
  res.json(trusses);
});

// Create a new truss
router.post('/', async (req, res) => {
  const newTruss = new Truss(req.body);
  await newTruss.save();
  res.json(newTruss);
});

module.exports = router;
