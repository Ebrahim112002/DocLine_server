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
      hospitalId, hospitalName, bookingType, appointmentDate,
      patientName, patientPhone, patientAge, patientGender, patientProblem,
      selectedDoctor, selectedTests, totalAmount
    } = req.body;

    // Validation (অতিরিক্ত নিরাপত্তার জন্য)
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).send({ message: "Invalid total amount" });
    }

    const newBooking = {
      userEmail: req.headers.email,
      hospitalId: new ObjectId(hospitalId),
      hospitalName,
      bookingType,
      appointmentDate,
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      patientProblem,
      selectedDoctor,
      selectedTests,
      totalAmount,
      status: "pending",
      createdAt: new Date()
    };

    await getDB().collection("bookings").insertOne(newBooking);
    res.status(201).send({ success: true, message: "Booking created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Server error" });
  }
});
// ==================== GET USER'S OWN BOOKINGS ====================
router.get('/my-bookings', verifyUser, async (req, res) => {
  try {
    const userEmail = req.headers.email?.toLowerCase().trim();
    
    console.log("=== MY BOOKINGS DEBUG ===");
    console.log("Received Email from Header:", userEmail);
    console.log("All Headers:", req.headers);

    if (!userEmail) {
      return res.status(400).send({ success: false, message: "User email not found in headers" });
    }
    const bookingsCollection = getDB().collection("bookings");
    const hospitalsCollection = getDB().collection("hospitals");
    const doctorsCollection = getDB().collection("doctors");

    const bookings = await bookingsCollection
      .find({ userEmail })
      .sort({ createdAt: -1 })
      .toArray();

    // Extra info যোগ করা
    const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
      let hospital = null;
      let doctor = null;

      if (booking.hospitalId) {
        hospital = await hospitalsCollection.findOne({ _id: booking.hospitalId });
      }
      if (booking.selectedDoctor?.doctorEmail) {
        doctor = await doctorsCollection.findOne({ 
          doctorEmail: booking.selectedDoctor.doctorEmail.toLowerCase().trim() 
        });
      }

      return {
        ...booking,
        hospitalName: hospital?.hospitalName || booking.hospitalName,
        doctorDetails: doctor || booking.selectedDoctor,
      };
    }));

    res.send({
      success: true,
      count: enrichedBookings.length,
      bookings: enrichedBookings
    });

  } catch (error) {
    console.error("My Bookings Error:", error);
    res.status(500).send({ 
      success: false, 
      message: "Failed to fetch bookings",
      error: error.message 
    });
  }
});
// Cancel Booking by User
router.patch('/cancel/:id', verifyUser, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userEmail = req.headers.email?.toLowerCase().trim();

    const bookingsCollection = getDB().collection("bookings");

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });

    if (!booking) {
      return res.status(404).send({ success: false, message: "Booking not found" });
    }

    if (booking.userEmail !== userEmail) {
      return res.status(403).send({ success: false, message: "You can only cancel your own bookings" });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).send({ success: false, message: "Booking already cancelled" });
    }

    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: { 
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: req.body.reason || 'Cancelled by user'
        } 
      }
    );

    res.send({ success: true, message: "Appointment cancelled successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ success: false, message: "Failed to cancel booking" });
  }
});

module.exports = router;