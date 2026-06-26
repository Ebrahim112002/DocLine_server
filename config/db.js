const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.dit9xra.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

const connectDB = async () => {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    db = client.db("doclineDB");

    console.log("MongoDB Connected 🚀");
  } catch (error) {
    console.log("DB Error:", error);
  }
};

const getDB = () => {
  return db;
};

module.exports = { connectDB, getDB };