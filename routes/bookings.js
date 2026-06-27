// routes/bookings.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { verifyUser } = require('../middlewares/authMiddleware');

const router = express.Router();

// [CREATE] - নতুন বুকিং প্লেস করা
router.post('/create',verifyUser, async (req, res) => {   // verifyUser সরিয়ে রাখুন এখন
  try {
    const {
      hospitalId,
      hospitalName,
      bookingType,
      appointmentDate,
      selectedDoctor,
      selectedTests,
      totalAmount,
      patientName,
      patientPhone
    } = req.body;

    const newBooking = {
      userEmail: req.headers.email || "guest@docline.com",
      hospitalId: new ObjectId(hospitalId),     // ← এখানে সঠিকভাবে ObjectId করা হয়েছে
      hospitalName,
      bookingType,
      appointmentDate,
      patientName,
      patientPhone,
      totalAmount: parseInt(totalAmount || 0),
      status: "pending",
      createdAt: new Date(),
      selectedDoctor: selectedDoctor || null,
      selectedTests: selectedTests || []
    };

    const result = await getDB().collection("bookings").insertOne(newBooking);
    
    res.status(201).send({ 
      success: true, 
      message: "Booking submitted successfully!",
      bookingId: result.insertedId 
    });
  } catch (error) {
    console.error("Booking Error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

module.exports = router;