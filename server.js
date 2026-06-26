require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB } = require("./config/db");
const userRoutes = require("./routes/userRoutes"); 
const hospitalRoutes = require("./routes/hospital"); 
const hospitalAdminRoutes = require("./routes/hospitalAdmin"); 
const hospitalPublicRouter = require('./routes/hospitalPublic'); // তোমার ফাইলের সঠিক পাথ দাও




const app = express();
const port = process.env.PORT || 3000;

/* Middleware */
app.use(cors({ 
  origin: 'http://localhost:5173',
  credentials: true 
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


app.get('/', (req, res) => {
  res.send('DocLine Server Running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});