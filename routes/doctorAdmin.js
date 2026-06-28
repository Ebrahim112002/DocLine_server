// routes/doctorAdmin.js
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db'); // Apnar server structure er dynamic db reference path

// ====================================================================\
// ১. GET ASSIGNED DOCTORS FOR ASSISTANT (Fixed Mapping Query)
// ====================================================================\
// Assistant login email check kore tar map-kora doctor er detail array return kore.
router.get('/all-doctors/:assistantEmail', async (req, res) => {
  try {
    const assistantEmail = req.params.assistantEmail.toLowerCase().trim();
    const assistantsCollection = getDB().collection("assistants");
    const doctorsCollection = getDB().collection("doctors");
    
    // Prothome assistants collection theke ei email er profile object-ti ber korbo
    const assistantDoc = await assistantsCollection.findOne({ assistantEmail: assistantEmail });
    
    // Jodi assistant na thake ba tar sathe kono doctor assign kora na thake
    if (!assistantDoc || !assistantDoc.doctorEmail) {
      return res.send([]); 
    }

    // Assign thaka doctorEmail ti dhore main doctors collection consistency update processing
    const doctor = await doctorsCollection.findOne(
      { doctorEmail: assistantDoc.doctorEmail.toLowerCase().trim() },
      { projection: { doctorName: 1, doctorEmail: 1, hospitalName: 1, specialty: 1 } }
    );

    res.send(doctor ? [doctor] : []);
  } catch (error) {
    console.error("Error fetching assigned doctors list:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

// ====================================================================\
// ২. GET ASSISTANT MY PROFILE BY EMAIL (New Standard Route)
// ====================================================================\
// userRoutes are synchronizer system theke generate kora assistants collection theke email query hobe
router.get('/assistant-profile/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const assistantsCollection = getDB().collection("assistants");
    
    const assistant = await assistantsCollection.findOne({ assistantEmail: email });
    
    if (!assistant) {
      return res.status(404).send({ success: false, message: "Assistant profile not found in node registry" });
    }
    res.send({ success: true, data: assistant });
  } catch (error) {
    console.error("Error fetching assistant profile:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

// ====================================================================\
// ৩. UPDATE ASSISTANT MY PROFILE (User Profile Engine er moto dynamic)
// ====================================================================\
// Assistant ekhon tar nijer dynamic fields (Name, Phone, Image) update korte parbe
router.put('/assistant-profile/update', async (req, res) => {
  try {
    const { assistantEmail, assistantName, phone, image } = req.body;
    const assistantsCollection = getDB().collection("assistants");

    if (!assistantEmail) {
      return res.status(400).send({ success: false, message: "Assistant operator identification email missing" });
    }

    const cleanEmail = assistantEmail.toLowerCase().trim();

    // User collection updates logic context optimization standard pattern:
    const result = await assistantsCollection.updateOne(
      { assistantEmail: cleanEmail },
      { 
        $set: { 
          assistantName: assistantName, 
          phone: phone, 
          image: image || "", 
          updatedAt: new Date() 
        } 
      }
    );

    res.send({ success: true, message: "Assistant profile updated successfully", modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("Error updating assistant profile setup:", error);
    res.status(500).send({ success: false, message: error.message });
  }
});

// ====================================================================\
// ৪. GET BOOKINGS BY DOCTOR EMAIL (Used for Scheduler & Live Queue Stream)
// ====================================================================\
router.get('/my-bookings/:doctorEmail', async (req, res) => {
  try {
    const doctorEmail = req.params.doctorEmail.toLowerCase().trim();
    const bookingsCollection = getDB().collection("bookings");
    
    // Doctor Email field tracking query directly inside target structure context
    const myBookings = await bookingsCollection.find({ 
      "selectedDoctor.doctorEmail": doctorEmail 
    }).toArray();
    
    res.send(myBookings);
  } catch (error) {
    console.error("Error fetching doctor bookings:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

// ====================================================================\
// ৫. PATCH: UPDATE APPOINTMENT GLOBAL STATUS (Confirm/Complete/Cancel)
// ====================================================================\
router.patch('/bookings/status/:id', async (req, res) => {
  try {
    const bookingsCollection = getDB().collection("bookings");
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: req.body.status, updatedAt: new Date() } }
    );
    res.send({ success: true, message: "Appointment status synchronization complete" });
  } catch (error) {
    console.error("Status update processing error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// ====================================================================\
// ৬. PATCH: UPDATE LIVE QUEUE RUNTIME STATUS (Waiting/Called/Inside/Completed)
// ====================================================================\
router.patch('/bookings/queue-status/:id', async (req, res) => {
  try {
    const bookingsCollection = getDB().collection("bookings");
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { queueStatus: req.body.queueStatus, updatedAt: new Date() } }
    );
    res.send({ success: true, message: "Live track token queue registry stage altered" });
  } catch (error) {
    console.error("Queue state updating error:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

// ===================================================================
// ২. GET DOCTOR PROFILE BY EMAIL (Optimized & Standardized)
// ===================================================================
router.get('/profile/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const doctorsCollection = getDB().collection("doctors");
    const doctor = await doctorsCollection.findOne({ doctorEmail: email });
    
    if (!doctor) {
      return res.status(404).send({ success: false, message: "Doctor profile not found in ledger" });
    }

    // Front-end mapping schema validation context mapping fix
    const standardizedDoctor = {
      ...doctor,
      bio: doctor.bio || doctor.biography || "", // mapping mismatch recovery bypass logic
      availableDays: doctor.availableDays || []
    };

    res.send(standardizedDoctor);
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

// ===================================================================
// ৩. PUT: UPDATE DOCTOR PROFILE BY EMAIL (Fixed Mapping Sync)
// ===================================================================
router.put('/profile/update/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const updateData = req.body;
    const doctorsCollection = getDB().collection("doctors");

    const updatedDoc = {
      $set: {
        doctorName: updateData.doctorName,
        specialty: updateData.specialty,
        primaryDegree: updateData.primaryDegree,
        visitFee: parseInt(updateData.visitFee) || 0,
        patientLimitPerDay: parseInt(updateData.patientLimitPerDay) || 20,
        roomNumber: updateData.roomNumber || "",
        phone: updateData.phone || "",
        bio: updateData.bio || updateData.biography || "", // Keep sync parameters
        biography: updateData.bio || updateData.biography || "", // Backwards compatibility protection
        availableDays: updateData.availableDays || [],
        updatedAt: new Date()
      }
    };

    const result = await doctorsCollection.updateOne({ doctorEmail: email }, updatedDoc);
    
    if (result.matchedCount === 0) {
      return res.status(404).send({ success: false, message: "Doctor account match failed" });
    }

    res.send({ success: true, message: "Profile synchronized safely!" });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

module.exports = router;