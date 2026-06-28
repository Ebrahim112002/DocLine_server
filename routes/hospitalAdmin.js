const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/db');

// ==========================================
// 1. [CREATE] - হসপিটাল এডমিন ডক্টর অ্যাড করবে
// ==========================================
router.post('/doctors/add', async (req, res) => {
  try {
    const doctorData = req.body;
    const hospitalsCollection = getDB().collection("hospitals");
    const doctorsCollection = getDB().collection("doctors");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: doctorData.adminEmail.toLowerCase().trim() });
    if (!hospitalAccount) {
      return res.status(404).send({ success: false, message: "Hospital account not found" });
    }

    const newDoctor = {
      hospitalId: hospitalAccount._id, 
      hospitalName: hospitalAccount.hospitalName,
      doctorName: doctorData.doctorName,
      doctorEmail: doctorData.doctorEmail.toLowerCase().trim(),
      specialty: doctorData.specialty,
      primaryDegree: doctorData.primaryDegree,
      visitFee: parseInt(doctorData.visitFee),
      image: doctorData.image || "", 
      status: "pending", 
      createdAt: new Date()
    };

    const exists = await doctorsCollection.findOne({ doctorEmail: doctorData.doctorEmail.toLowerCase().trim() });
    if (exists) {
      return res.status(400).send({ success: false, message: "Doctor email already invited/exists." });
    }

    await doctorsCollection.insertOne(newDoctor);
    res.status(201).send({ success: true, message: "Doctor invited successfully!" });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 2. [READ] - নির্দিষ্ট হাসপাতালের সব ডক্টর দেখা
// ==========================================
router.get('/doctors/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const hospitalsCollection = getDB().collection("hospitals");
    const doctorsCollection = getDB().collection("doctors");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: email });
    if (!hospitalAccount) return res.status(404).send([]);

    const result = await doctorsCollection.find({ hospitalId: hospitalAccount._id }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// 3. [DELETE] - ডক্টর ডিলিট করা
// ==========================================
router.delete('/doctors/delete/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const doctorsCollection = getDB().collection("doctors");
    
    const result = await doctorsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// 4. [UPDATE] - ডক্টর নিজে প্রোফাইল আপডেট করবে
// ==========================================
router.put('/doctors/self-update', async (req, res) => {
  try {
    const { doctorEmail, image, biography, visitFee } = req.body;
    const doctorsCollection = getDB().collection("doctors");

    const filter = { doctorEmail: doctorEmail.toLowerCase().trim() };
    
    const updatedDoc = {
      $set: {
        image: image, 
        biography: biography || "",
        visitFee: parseInt(visitFee),
        updatedAt: new Date()
      }
    };

    const result = await doctorsCollection.updateOne(filter, updatedDoc);
    if(result.modifiedCount === 0) {
        return res.status(400).send({ success: false, message: "No changes made or doctor not found." });
    }
    
    res.send({ success: true, message: "Doctor profile updated successfully!" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// 5. [CREATE] - অ্যাসিস্ট্যান্ট অ্যাড করা
// ==========================================
router.post('/assistants/add', async (req, res) => {
  try {
    const assistantData = req.body;
    const hospitalsCollection = getDB().collection("hospitals");
    const assistantsCollection = getDB().collection("assistants");
    const doctorsCollection = getDB().collection("doctors");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: assistantData.adminEmail.toLowerCase().trim() });
    if (!hospitalAccount) {
      return res.status(404).send({ success: false, message: "Hospital account not found" });
    }

    const doctor = await doctorsCollection.findOne({ doctorEmail: assistantData.assignedDoctorEmail.toLowerCase().trim() });

    const newAssistant = {
      hospitalId: hospitalAccount._id, 
      hospitalName: hospitalAccount.hospitalName,
      assistantName: assistantData.assistantName,
      assistantEmail: assistantData.assistantEmail.toLowerCase().trim(),
      phone: assistantData.phone || "",
      image: "", 
      assignedDoctorEmail: assistantData.assignedDoctorEmail.toLowerCase().trim(),
      assignedDoctorName: doctor ? doctor.doctorName : "Not Assigned Yet",
      status: "pending", 
      createdAt: new Date()
    };

    const exists = await assistantsCollection.findOne({ assistantEmail: assistantData.assistantEmail.toLowerCase().trim() });
    if (exists) {
      return res.status(400).send({ success: false, message: "Assistant email already invited/exists." });
    }

    await assistantsCollection.insertOne(newAssistant);
    res.status(201).send({ success: true, message: "Assistant invited successfully!" });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 6. [READ] - নির্দিষ্ট হাসপাতালের সব অ্যাসিস্ট্যান্ট দেখা
// ==========================================
router.get('/assistants/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const hospitalsCollection = getDB().collection("hospitals");
    const assistantsCollection = getDB().collection("assistants");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: email });
    if (!hospitalAccount) return res.status(404).send([]);

    const result = await assistantsCollection.find({ hospitalId: hospitalAccount._id }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// 7. [UPDATE] - এডমিন অ্যাসিস্ট্যান্ট আপডেট করবে
// ==========================================
router.put('/assistants/update/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updatedData = req.body;
    const assistantsCollection = getDB().collection("assistants");
    const doctorsCollection = getDB().collection("doctors");

    const doctor = await doctorsCollection.findOne({ doctorEmail: updatedData.assignedDoctorEmail.toLowerCase().trim() });

    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        assistantName: updatedData.assistantName,
        phone: updatedData.phone,
        assignedDoctorEmail: updatedData.assignedDoctorEmail.toLowerCase().trim(),
        assignedDoctorName: doctor ? doctor.doctorName : "Not Assigned Yet",
        updatedAt: new Date()
      }
    };

    const result = await assistantsCollection.updateOne(filter, updatedDoc);
    res.send({ success: true, message: "Assistant updated successfully!", modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 8. [DELETE] - অ্যাসিস্ট্যান্ট ডিলিট করা
// ==========================================
router.delete('/assistants/delete/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const assistantsCollection = getDB().collection("assistants");

    const result = await assistantsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 9. [SELF-UPDATE] - অ্যাসিস্ট্যান্ট নিজের প্রোফাইল আপডেট করবে
// ==========================================
router.put('/assistants/self-update', async (req, res) => {
  try {
    const { assistantEmail, image, phone } = req.body;
    const assistantsCollection = getDB().collection("assistants");

    const filter = { assistantEmail: assistantEmail.toLowerCase().trim() };
    const updatedDoc = {
      $set: {
        image: image, 
        phone: phone,
        updatedAt: new Date()
      }
    };

    const result = await assistantsCollection.updateOne(filter, updatedDoc);
    if (result.modifiedCount === 0) {
      return res.status(400).send({ success: false, message: "No changes made or assistant not found." });
    }

    res.send({ success: true, message: "Assistant profile updated successfully!" });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 10. [PATCH] - Assistant To Doctor Mapping ফিক্স
// ==========================================
router.patch('/assistants/update-doctor/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { assignedDoctorEmail, assignedDoctorName } = req.body;
    const assistantsCollection = getDB().collection("assistants");
    const doctorsCollection = getDB().collection("doctors");

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ success: false, message: "Invalid ID format" });
    }

    const currentAssistant = await assistantsCollection.findOne({ _id: new ObjectId(id) });
    if (!currentAssistant) {
      return res.status(404).send({ success: false, message: "Assistant not found" });
    }

    if (currentAssistant.assignedDoctorEmail) {
      await doctorsCollection.updateOne(
        { doctorEmail: currentAssistant.assignedDoctorEmail },
        { $set: { assignedAssistantEmail: "", assignedAssistantName: "" } }
      );
    }

    await assistantsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          assignedDoctorEmail: assignedDoctorEmail ? assignedDoctorEmail.toLowerCase().trim() : "", 
          assignedDoctorName: assignedDoctorName || "Not Assigned",
          updatedAt: new Date() 
        } 
      }
    );

    if (assignedDoctorEmail) {
      await doctorsCollection.updateOne(
        { doctorEmail: assignedDoctorEmail.toLowerCase().trim() },
        { 
          $set: { 
            assignedAssistantEmail: currentAssistant.assistantEmail, 
            assignedAssistantName: currentAssistant.assistantName 
          } 
        }
      );
    }

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 11. [CREATE] - নতুন টেস্ট অ্যাড করা
// ==========================================
router.post('/tests/add', async (req, res) => {
  try {
    const { adminEmail, testName, testCode, testFee, description } = req.body;
    const hospitalsCollection = getDB().collection("hospitals");
    const testsCollection = getDB().collection("tests");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: adminEmail.toLowerCase().trim() });
    if (!hospitalAccount) {
      return res.status(404).send({ success: false, message: "Hospital account not found" });
    }

    const exists = await testsCollection.findOne({
      hospitalId: hospitalAccount._id,
      $or: [
        { testName: testName.trim() },
        { testCode: testCode.trim().toUpperCase() }
      ]
    });

    if (exists) {
      return res.status(400).send({ success: false, message: "Test name or code already exists." });
    }

    const newTest = {
      hospitalId: hospitalAccount._id,
      hospitalName: hospitalAccount.hospitalName,
      testName: testName.trim(),
      testCode: testCode.trim().toUpperCase(),
      testFee: parseInt(testFee) || 0,
      description: description || "",
      status: "available",
      createdAt: new Date()
    };

    await testsCollection.insertOne(newTest);
    res.status(201).send({ success: true, message: "Medical test added successfully!" });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 12. [READ] - হাসপাতালের সব টেস্ট লিস্ট দেখা
// ==========================================
router.get('/tests/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    const hospitalsCollection = getDB().collection("hospitals");
    const testsCollection = getDB().collection("tests");

    const hospitalAccount = await hospitalsCollection.findOne({ adminEmail: email });
    if (!hospitalAccount) return res.status(404).send([]);

    const result = await testsCollection.find({ hospitalId: hospitalAccount._id }).sort({ createdAt: -1 }).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// ==========================================
// 13. [UPDATE] - টেস্ট মডিফাই করা
// ==========================================
router.put('/tests/update/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { testName, testCode, testFee, description, status } = req.body;
    const testsCollection = getDB().collection("tests");

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ success: false, message: "Invalid Test ID format." });
    }

    const updatedDoc = {
      $set: {
        testName: testName.trim(),
        testCode: testCode.trim().toUpperCase(),
        testFee: parseInt(testFee) || 0,
        description: description || "",
        status: status || "available",
        updatedAt: new Date()
      }
    };

    const result = await testsCollection.updateOne({ _id: new ObjectId(id) }, updatedDoc);
    res.send({ success: true, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 14. [DELETE] - টেস্ট ডিলিট করা
// ==========================================
router.delete('/tests/delete/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const testsCollection = getDB().collection("tests");

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ success: false, message: "Invalid ID format." });
    }

    const result = await testsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 15. [READ ALL HOSPITALS] - 🎯 ফিক্সড রাউটার রুট
// ==========================================
router.get('/', async (req, res) => {
  try {
    const hospitalsCollection = getDB().collection("hospitals");
    const result = await hospitalsCollection.find({}).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==========================================
// 16. [READ SINGLE HOSPITAL] - 🎯 ফিক্সড রাউটার রুট
// ==========================================
router.get('/details-internal/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const hospitalsCollection = getDB().collection("hospitals");
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ success: false, message: "Invalid Hospital ID format" });
    }
    
    const result = await hospitalsCollection.findOne({ _id: new ObjectId(id) });
    if (!result) return res.status(404).send({ success: false, message: "Hospital not found" });
    
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, error: error.message });
  }
});

// ==================== 1. GET ALL BOOKINGS FOR HOSPITAL ADMIN ====================
router.get('/bookings/:adminEmail', async (req, res) => {
  try {
    const { adminEmail } = req.params;
    console.log(`🔍 Fetching bookings for admin: ${adminEmail}`);

    const hospitalsCollection = getDB().collection("hospitals");
    const bookingsCollection = getDB().collection("bookings");

    // হসপিটাল খুঁজে বের করা
    const hospitalAccount = await hospitalsCollection.findOne({ 
      adminEmail: adminEmail.toLowerCase().trim() 
    });

    if (!hospitalAccount) {
      console.log("❌ Hospital not found with email:", adminEmail);
      return res.status(404).send({ message: "Hospital not found for this email" });
    }

    const correctHospitalId = hospitalAccount._id;
    console.log("✅ Hospital found. Correct ID:", correctHospitalId.toString());

    // বুকিং খুঁজে বের করা (ObjectId + String দুইভাবে)
    const bookings = await bookingsCollection.find({
      $or: [
        { hospitalId: correctHospitalId },                    // ObjectId
        { hospitalId: correctHospitalId.toString() }         // String
      ]
    }).sort({ createdAt: -1 }).toArray();

    console.log(`✅ Found ${bookings.length} booking(s)`);

    // Debug: প্রথম বুকিং এর hospitalId দেখানো
    if (bookings.length > 0) {
      console.log("Sample booking hospitalId:", bookings[0].hospitalId);
    }

    res.send(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).send({ error: error.message });
  }
});

// ==================== 2. UPDATE BOOKING STATUS ====================
// ==================== 2. UPDATE BOOKING STATUS & AUTOMATIC QUEUE SYSTEM ====================
router.patch('/bookings/status/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status, adminEmail } = req.body; // ফ্রন্টএন্ড থেকে status এবং adminEmail আসবে

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).send({ success: false, message: "Invalid Booking ID format" });
    }

    const bookingsCollection = getDB().collection("bookings");

    // ১. প্রথমে কারেন্ট বুকিং ডেটা খুঁজে বের করি (তারিখ, হাসপাতাল এবং টাইপ জানার জন্য)
    const currentBooking = await bookingsCollection.findOne({ _id: new ObjectId(bookingId) });
    if (!currentBooking) {
      return res.status(404).send({ success: false, message: "Booking not found" });
    }

    let updateFields = { status: status, updatedAt: new Date() };

    // ২. 🎯 মেইন এপ্রুভাল লজিক: যখন এডমিন Approve করবে (status === 'confirmed')
    if (status === 'confirmed' && !currentBooking.queueNumber) {
      
      // একই হাসপাতাল, একই অ্যাপয়েন্টমেন্ট ডেট এবং অলরেডি confirmed বুকিং গোনার বেস কোয়েরি
      let queueQuery = {
        hospitalId: currentBooking.hospitalId,
        status: "confirmed",
        appointmentDate: currentBooking.appointmentDate
      };

      // রিকোয়ারমেন্ট ১: ডক্টর অ্যাপয়েন্টমেন্ট হলে ডক্টরের ইমেইল অনুযায়ী আলাদা কিউ (Reset Every Day)
      if (currentBooking.bookingType === 'doctor') {
        queueQuery.bookingType = 'doctor';
        queueQuery["selectedDoctor.doctorEmail"] = currentBooking.selectedDoctor?.doctorEmail;
      } 
      // 🔬 রিকোয়ারমেন্ট ২: ল্যাব টেস্ট অ্যাপয়েন্টমেন্ট হলে সব টেস্টের জন্য একটি কমন দৈনিক কিউ (Reset Every Day)
      else if (currentBooking.bookingType === 'test') {
        queueQuery.bookingType = 'test';
      }

      // ইতিমধ্যে কতজন লাইনে কনফার্মড আছে তা কাউন্ট করা
      const countConfirmed = await bookingsCollection.countDocuments(queueQuery);

      // 🚀 ফিউচার-প্রুফ আর্কিটেকচার ফিল্ডস যুক্ত করা
      updateFields.queueNumber = countConfirmed + 1; // পরবর্তী সিরিয়াল নাম্বার
      updateFields.queueStatus = "waiting";          // default status
      updateFields.approvedAt = new Date();
      updateFields.approvedBy = adminEmail || "Hospital Admin";
      updateFields.calledAt = null;
      updateFields.completedAt = null;
      updateFields.estimatedWaitTime = ((countConfirmed) * 15) + " mins"; // প্রতি রোগীর জন্য ১৫ মিনিট করে আনুমানিক সময়
    }

    // ৩. যদি কোনো বুকিং বাতিল (cancelled) করা হয়, তবে কিউ স্ট্যাটাসও বাতিল হবে
    if (status === 'cancelled') {
      updateFields.queueStatus = 'cancelled';
    }

    // ডেটাবেজে আপডেট করা
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ success: false, message: "Booking not found or status unchanged" });
    }

    // ৪. ⚡ অটোমেটিক সিরিয়াল রিক্যালকুলেশন (মাঝে কেউ ক্যানসেল হলে গ্যাপ ফিলআপ করা)
    if (status === 'cancelled' && currentBooking.status === 'confirmed') {
      let rebuildQuery = {
        hospitalId: currentBooking.hospitalId,
        status: "confirmed",
        appointmentDate: currentBooking.appointmentDate
      };

      if (currentBooking.bookingType === 'doctor') {
        rebuildQuery.bookingType = 'doctor';
        rebuildQuery["selectedDoctor.doctorEmail"] = currentBooking.selectedDoctor?.doctorEmail;
      } else {
        rebuildQuery.bookingType = 'test';
      }

      // এপ্রুভালের সময় অনুযায়ী সাজিয়ে বাকিদের সিরিয়াল রি-অ্যারেঞ্জ করা
      const activeBookings = await bookingsCollection.find(rebuildQuery).sort({ approvedAt: 1 }).toArray();

      for (let i = 0; i < activeBookings.length; i++) {
        await bookingsCollection.updateOne(
          { _id: activeBookings[i]._id },
          { $set: { queueNumber: i + 1, estimatedWaitTime: (i * 15) + " mins" } }
        );
      }
    }

    console.log(`Booking ${bookingId} approved & smart queue generated.`);
    res.send({ success: true, message: `Booking status updated and queue generated!` });

  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).send({ success: false, error: error.message });
  }
});

module.exports = router;

module.exports = router;