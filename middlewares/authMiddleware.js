const { getDB } = require("../config/db");

// ======================
// verifyUser Middleware (Improved)
const verifyUser = async (req, res, next) => {
  try {
    let email = req.headers.email || req.headers['x-user-email'];

    // Authorization Header থেকে Token চেক (Bearer)
    const authHeader = req.headers.authorization;
    if (!email && authHeader && authHeader.startsWith('Bearer ')) {
      // এখনো JWT decode না করলে শুধু email header এর উপর নির্ভর করব
      console.log("Authorization header found but no email header");
    }

    if (!email) {
      return res.status(401).send({ 
        message: "Unauthorized: Email header is missing. Please send email in headers." 
      });
    }

    req.userEmail = email;
    next();
  } catch (error) {
    console.error("Verify User Error:", error);
    res.status(401).send({ message: "Authentication failed" });
  }
};

// ======================
// verifyAdmin Middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const email = req.userEmail;
    if (!email) {
      return res.status(401).send({ message: "Unauthorized: Email not found" });
    }

    const db = getDB();
    const usersCollection = db.collection("users");
    
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (user.role !== 'admin') {
      return res.status(403).send({ message: "Forbidden access! Admins only." });
    }

    req.user = user; // Extra info for later use
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = { verifyUser, verifyAdmin };