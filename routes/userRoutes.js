const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');
const { verifyUser, verifyAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();
const getUsersCollection = () => getDB().collection("users");
const getInvitesCollection = () => getDB().collection("invites");
const getDoctorsCollection = () => getDB().collection("doctors");       
const getAssistantsCollection = () => getDB().collection("assistants"); 

// =========================================================================
// [CREATE/UPSERT] - Public (Registration & Role Sync)
// =========================================================================
router.post('/', async (req, res) => {
  try {
    const user = req.body; 
    const usersCollection = getUsersCollection();
    const invitesCollection = getInvitesCollection();
    const doctorsCollection = getDoctorsCollection();
    const assistantsCollection = getAssistantsCollection();

    const cleanEmail = user.email ? user.email.toLowerCase().trim() : "";

    if (!cleanEmail) {
      return res.status(400).send({ message: 'Email is required' });
    }

    // ১. চেক করুন ইউজারটি কোনো সাসপেন্ডেড/ব্যানড তালিকায় আছে কি না
    const bannedDoctor = await doctorsCollection.findOne({ doctorEmail: cleanEmail, status: "banned" });
    const bannedAssistant = await assistantsCollection.findOne({ assistantEmail: cleanEmail, status: "banned" });
    
    if (bannedDoctor || bannedAssistant) {
      return res.status(403).send({ success: false, message: "This corporate account has been suspended by Admin." });
    }

    let finalRole = "user"; // ডিফল্ট রোল
    let hospitalId = null;
    let messageStr = "Registered as Regular User!";

    // ২. চেইন চেকিং লজিক (এডমিন -> ডক্টর -> অ্যাসিস্ট্যান্ট)
    const invite = await invitesCollection.findOne({ email: cleanEmail });
    const pendingDoctor = await doctorsCollection.findOne({ doctorEmail: cleanEmail });
    const pendingAssistant = await assistantsCollection.findOne({ assistantEmail: cleanEmail });

    if (invite) {
      finalRole = invite.role || "hospital_admin";        
      hospitalId = invite.hospitalId; 
      messageStr = "Registered as Hospital Admin!";
      
      await invitesCollection.updateOne(
        { _id: invite._id },
        { $set: { status: "success", acceptedAt: new Date() } }
      );
    } else if (pendingDoctor) {
      finalRole = "doctor";
      hospitalId = pendingDoctor.hospitalId; 
      messageStr = "Registered as Official Doctor! 🩺";
      
      await doctorsCollection.updateOne(
        { doctorEmail: cleanEmail },
        { $set: { status: "active", role: "doctor", uid: user.uid } }
      );
    } else if (pendingAssistant) {
      finalRole = "assistant";
      hospitalId = pendingAssistant.hospitalId; 
      messageStr = "Registered as Medical Assistant! 📋";
      
      await assistantsCollection.updateOne(
        { assistantEmail: cleanEmail },
        { $set: { status: "active", role: "assistant", uid: user.uid } }
      );
    }

    // ৩. মেইন ইউজার অবজেক্ট তৈরি (Upsert মেকানিজম ব্যবহার করা হলো যেন ফায়ারবেস সোশাল লগইনেও ডাটা সিঙ্ক হয়)
   const userPayload = {
      name: user.name,
      email: cleanEmail,
      uid: user.uid, 
      photoURL: user.photoURL || "",
      
      // 🔥 নতুন যোগ করা ফিল্ডগুলো
      phone: user.phone || "",
      gender: user.gender || "",
      dateOfBirth: user.dateOfBirth || null,

      role: finalRole, 
      hospitalId: hospitalId,
      status: "active",
      updatedAt: new Date()
    };

    // প্রথমবার রেজিস্ট্রেশন হলে createdAt অ্যাড হবে
    const existingUser = await usersCollection.findOne({ email: cleanEmail });
    if (!existingUser) {
      userPayload.createdAt = new Date();
    }

    const result = await usersCollection.updateOne(
      { email: cleanEmail },
      { $set: userPayload },
      { upsert: true }
    );

    res.status(200).send({
      success: true,
      role: finalRole,
      message: messageStr
    });

  } catch (error) {
    console.error("Registration route error:", error);
    res.status(500).send({ error: error.message });
  }
});

// =========================================================================
// [READ ALL] - Super Admin Only - সব ইউজারের লিস্ট দেখা
// =========================================================================
router.get('/', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const usersCollection = getUsersCollection();
    const result = await usersCollection.find().toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// =========================================================================
// [READ SINGLE] - নির্দিষ্ট ইউজারের ডাটা দেখা
// =========================================================================
router.get('/:email', verifyUser, async (req, res) => {
  try {
    const email = req.params.email ? req.params.email.toLowerCase().trim() : "";
    const requestEmail = req.userEmail ? req.userEmail.toLowerCase().trim() : ""; 
    const usersCollection = getUsersCollection();

    if (requestEmail !== email) {
      const requester = await usersCollection.findOne({ email: requestEmail });
      if (!requester || (requester.role !== 'super_admin' && requester.role !== 'admin')) {
        return res.status(403).send({ message: "Forbidden! Access denied." });
      }
    }

    const result = await usersCollection.findOne({ email: email });
    if (!result) {
      return res.status(404).send({ message: "User not found" });
    }
    
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// =========================================================================
// [UPDATE ROLE] - Super Admin Only
// =========================================================================
router.patch('/:id', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { role } = req.body;
    const usersCollection = getUsersCollection();

    const targetUser = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return res.status(404).send({ message: "User not found" });
    }

    if (targetUser.email.toLowerCase().trim() === req.userEmail.toLowerCase().trim()) {
      return res.status(403).send({ message: "You cannot change your own role" });
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role: role } }
    );

    res.send({ 
      success: result.modifiedCount > 0, 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// =========================================================================
// [DELETE] - Super Admin Only
// =========================================================================
router.delete('/:id', verifyUser, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const usersCollection = getUsersCollection();

    const targetUser = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!targetUser) {
      return res.status(404).send({ message: "User not found" });
    }

    if (targetUser.email.toLowerCase().trim() === req.userEmail.toLowerCase().trim()) {
      return res.status(403).send({ message: "You cannot delete yourself" });
    }

    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    res.send({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// routes/userRoutes.js এর শেষে যোগ করো (DELETE রুটের আগে)


// =========================================================================
// [UPDATE PROFILE] - User নিজে প্রোফাইল আপডেট করতে পারবে
// =========================================================================
router.put('/profile', verifyUser, async (req, res) => {
  try {
    const userEmail = req.userEmail; // middleware থেকে আসবে
    const updateData = req.body;
    const usersCollection = getUsersCollection();

    const allowedUpdates = {
      name: updateData.name,
      photoURL: updateData.photoURL,
      phone: updateData.phone,
      gender: updateData.gender,
      dateOfBirth: updateData.dateOfBirth,
      updatedAt: new Date()
    };

    const result = await usersCollection.updateOne(
      { email: userEmail },
      { $set: allowedUpdates }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).send({ success: false, message: "No changes made" });
    }

    res.send({ 
      success: true, 
      message: "Profile updated successfully!" 
    });

  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;