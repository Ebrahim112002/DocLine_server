require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB } = require("./config/db");
const userRoutes = require("./routes/userRoutes"); 
const hospitalRoutes = require("./routes/hospital"); 
const hospitalAdminRoutes = require("./routes/hospitalAdmin"); 
const hospitalPublicRouter = require('./routes/hospitalPublic'); 
const bookingRouter = require('./routes/bookings'); 
const doctorAdminRouter = require('./routes/doctorAdmin');


const app = express();
const port = process.env.PORT || 3000;

/* Middleware */
// সার্ভারে এটা চেক করুন
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:3000','https://doclineebrahim.netlify.app/'], // frontend ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'email']  // ← এই লাইনটি গুরুত্বপূর্ণ
}));

app.use(express.json());
app.use(cookieParser());

/* Connect DB */
connectDB();

/* Routes */
app.use('/users', userRoutes); 
app.use('/hospitals', hospitalRoutes); 
app.use('/hospitals', hospitalAdminRoutes);    
app.use('/hospital-public', hospitalPublicRouter);
app.use('/bookings', bookingRouter)
app.use('/doctors', doctorAdminRouter);

app.get('/', (req, res) => {
  res.send('DocLine Server Running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});