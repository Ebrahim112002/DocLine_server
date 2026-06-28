// routes/hospitalPublic.js
const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

const router = express.Router();

// ==========================================
// PUBLIC ROUTES - যেকোনো ইউজার দেখতে পারবে
// ==========================================

// ১. Get All Hospitals with Stats + Profile Images
router.get('/all', async (req, res) => {
  try {
    const hospitalsCollection = getDB().collection("hospitals");
    const profilesCollection = getDB().collection("hospital_profiles");
    const doctorsCollection = getDB().collection("doctors");
    const testsCollection = getDB().collection("tests");

    const hospitals = await hospitalsCollection.find({ status: "active" }).toArray();

    const result = await Promise.all(hospitals.map(async (hospital) => {
      // 🎯 প্রোফাইল টেবিল থেকে লোগো এবং কভার ইমেজ নিয়ে আসা
      const profile = await profilesCollection.findOne({ hospitalId: hospital._id.toString() });

      const doctorCount = await doctorsCollection.countDocuments({ 
        hospitalId: hospital._id, 
        status: "active" 
      });
      
      const testCount = await testsCollection.countDocuments({ 
        hospitalId: hospital._id, 
        status: "available" 
      });

      return {
        ...hospital,
        // প্রোফাইল থাকলে সেটার ইমেজ ও ডাটা মার্জ হবে, না থাকলে ব্ল্যাঙ্ক থাকবে
        hospitalLogo: profile ? profile.hospitalLogo : "",
        hospitalCover: profile ? profile.hospitalCover : "",
        district: profile ? profile.district : "",
        fullAddress: profile ? profile.fullAddress : hospital.address,
        doctorCount,
        testCount
      };
    }));

    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ২. Get Single Hospital Details (Merged from profile) + Doctors + Tests
router.get('/details/:id', async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const hospitalsCollection = getDB().collection("hospitals");
    const profilesCollection = getDB().collection("hospital_profiles");
    const doctorsCollection = getDB().collection("doctors");
    const testsCollection = getDB().collection("tests");

    if (!ObjectId.isValid(hospitalId)) {
      return res.status(400).send({ message: "Invalid Hospital ID format" });
    }

    const hospitalAccount = await hospitalsCollection.findOne({ _id: new ObjectId(hospitalId) });
    if (!hospitalAccount) return res.status(404).send({ message: "Hospital not found" });

    // 🎯 প্রোফাইল টেবিল থেকে সম্পূর্ণ এক্সটেন্ডেড ডাটা নিয়ে আসা
    const profile = await profilesCollection.findOne({ hospitalId: hospitalId.toString() });

    // মেইন অ্যাকাউন্ট এবং প্রোফাইলের ডাটা একসাথে কম্বাইন করা
    const combinedHospitalData = {
      ...hospitalAccount,
      ...(profile || {}) // যদি প্রোফাইল থাকে তবে সব ডাটা মার্জ হবে
    };

    // ডক্টর খোঁজা (সরাসরি ObjectId রিলেশন ধরে)
    const doctors = await doctorsCollection.find({ 
      hospitalId: new ObjectId(hospitalId), 
      status: "active" 
    }).toArray();

    // টেস্ট খোঁজা (সরাসরি ObjectId রিলেশন ধরে)
    const tests = await testsCollection.find({ 
      hospitalId: new ObjectId(hospitalId), 
      status: "available" 
    }).toArray();

    res.send({
      hospital: combinedHospitalData,
      doctors,
      tests
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});
// =========================================================================
// [GET] ALL ACTIVE DOCTORS WITH HOSPITAL METADATA (For AllDoctors.jsx)
// =========================================================================
router.get('/all-doctors', async (req, res) => {
  try {
    const doctorsCollection = getDB().collection("doctors");
    const hospitalsCollection = getDB().collection("hospitals");

    // Shokol active status dynamic mapping logic filtering load 
    const activeDoctors = await doctorsCollection.find({ status: "active" }).toArray();

    // Protiti doctor dynamic system mapping pipeline array processing
    const combinedDoctors = await Promise.all(activeDoctors.map(async (doctor) => {
      // Doctor profile er thaka hospital database object context pipeline track
      const hospitalDoc = await hospitalsCollection.findOne({ _id: new ObjectId(doctor.hospitalId) });
      
      return {
        ...doctor,
        hospitalName: hospitalDoc ? hospitalDoc.hospitalName : doctor.hospitalName,
        hospitalAddress: hospitalDoc ? hospitalDoc.address : "Location details not updated"
      };
    }));

    res.send({ success: true, data: combinedDoctors });
  } catch (error) {
    console.error("Error fetching global active doctors registry:", error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
});

module.exports = router;