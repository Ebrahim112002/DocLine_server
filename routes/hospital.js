const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { verifyUser, verifyAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

const getHospitalsCollection = () => getDB().collection("hospitals");
const getInvitesCollection = () => getDB().collection("invites");

// ==========================================
// [CREATE] - Add Hospital & Create Invite (Super Admin Only)
// ==========================================
router.post('/add-hospital', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const { hospitalName, phone, address, adminEmail, adminName } = req.body;
    const hospitalsCollection = getHospitalsCollection();
    const invitesCollection = getInvitesCollection();

    const existingHospital = await hospitalsCollection.findOne({ adminEmail: adminEmail.toLowerCase().trim() });
    if (existingHospital) {
      return res.status(400).send({ message: "This Admin Email is already assigned to a hospital!" });
    }

    const newHospital = {
      hospitalName,
      phone,
      address,
      adminEmail: adminEmail.toLowerCase().trim(),
      adminName,
      status: "active",
      createdAt: new Date()
    };
    const hospitalResult = await hospitalsCollection.insertOne(newHospital);
    const hospitalId = hospitalResult.insertedId;

    const newInvite = {
      email: adminEmail.toLowerCase().trim(),
      role: "hospital_admin",
      hospitalId: hospitalId, // ObjectId রাখা হলো
      status: "pending",
      createdAt: new Date()
    };
    await invitesCollection.insertOne(newInvite);

    res.status(201).send({ 
      success: true, 
      message: "Hospital added and Invitation created successfully!",
      hospitalId 
    });

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// [READ ALL] - Get All Hospitals (Super Admin Only)
// ==========================================
router.get('/manage-hospitals', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const hospitalsCollection = getHospitalsCollection();
    const result = await hospitalsCollection.find().sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// [UPDATE STATUS] - Toggle Hospital Status
// ==========================================
router.patch('/status/:id', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const hospitalsCollection = getHospitalsCollection();

    const result = await hospitalsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: status } }
    );

    res.send({ success: result.modifiedCount > 0 });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// [READ PROFILE] - ইমেইল দিয়ে প্রোফাইল ফেচ করা
// ==========================================
router.get('/profile/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const hospitalsCollection = getDB().collection("hospitals");
    const profilesCollection = getDB().collection("hospital_profiles");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: email });
    if (!hospitalAccount) {
      return res.status(404).send({ message: "Hospital account not found" });
    }

    // কোয়েরি অবজেক্ট আইডি অথবা স্ট্রিং দুই ফরম্যাটেই সাপোর্ট দেওয়া হলো ম্যাচিং নিশ্চিত করতে
    const profile = await profilesCollection.findOne({ 
      $or: [
        { hospitalId: hospitalAccount._id },
        { hospitalId: hospitalAccount._id.toString() }
      ]
    });
    
    if (!profile) {
      return res.send({
        hospitalId: hospitalAccount._id,
        hospitalName: hospitalAccount.hospitalName || "",
        phone: hospitalAccount.phone || "",
        fullAddress: hospitalAccount.address || "",
        isProfileComplete: false
      });
    }

    res.send(profile);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// [UPDATE/UPSERT PROFILE] - প্রোফাইল আপডেট বা ইনসার্ট করা
// ==========================================
router.put('/profile', async (req, res) => {
  try {
    const profileData = req.body;
    const hospitalsCollection = getDB().collection("hospitals");
    const profilesCollection = getDB().collection("hospital_profiles");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: profileData.email.toLowerCase().trim() });
    if (!hospitalAccount) {
      return res.status(404).send({ message: "Hospital account not found" });
    }

    const filter = { hospitalId: hospitalAccount._id };
    const updatedDoc = {
      $set: {
        hospitalId: hospitalAccount._id, // 🎯ObjectId হিসেবে রাখা হলো কনসিস্টেন্সির জন্য
        hospitalName: profileData.hospitalName,
        hospitalType: profileData.hospitalType,
        licenseNumber: profileData.licenseNumber,
        establishedYear: profileData.establishedYear ? parseInt(profileData.establishedYear) : null,
        shortDescription: profileData.shortDescription || "",
        phone: profileData.phone,
        emergencyPhone: profileData.emergencyPhone,
        district: profileData.district,
        fullAddress: profileData.fullAddress,
        hospitalLogo: profileData.hospitalLogo,
        hospitalCover: profileData.hospitalCover,
        hasEmergency247: profileData.hasEmergency247 === true,
        hasAmbulance: profileData.hasAmbulance === true,
        hasICU: profileData.hasICU === true,
        isProfileComplete: true,
        updatedAt: new Date()
      }
    };

    const result = await profilesCollection.updateOne(filter, updatedDoc, { upsert: true });

    res.send({ 
      success: true, 
      message: "Hospital profile separated and saved successfully!" 
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;