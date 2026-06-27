// routes/bookings.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { verifyUser } = require('../middlewares/authMiddleware');

const router = express.Router();

// [CREATE] - নতুন বুকিং প্লেস করা
router.post('/create', verifyUser, async (req, res) => {
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
      patientPhone,
      patientAge,
      patientGender,
      patientProblem
    } = req.body;

    // Full booking object with all fields
    const newBooking = {
      userEmail: req.headers.email || "guest@docline.com",
      
      hospitalId: new ObjectId(hospitalId),
      hospitalName,

      bookingType,
      appointmentDate: new Date(appointmentDate),
      
      // Patient Details
      patientName,
      patientAge: patientAge ? parseInt(patientAge) : null,
      patientGender,
      patientPhone,
      patientProblem: patientProblem || "",

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
    res.status(500).send({ 
      success: false, 
      message: "Failed to create booking",
      error: error.message 
    });
  }
});

module.exports = router;