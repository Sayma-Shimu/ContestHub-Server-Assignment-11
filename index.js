const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.xnz0dsd.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const contestCollection = client
      .db("contestHub")
      .collection("contestUser");

    app.get('/all-contests', async (req, res) => {
      const { type } = req.query;

      let query = { status: "confirmed" }; 

      if (type && type !== "All") {
        query.contestType = type;
      }

      const result = await contestCollection.find(query).toArray();
      res.send(result);
    });

    console.log("MongoDB connected successfully");
  } finally {
    
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('ContestHub Server Running');
});

app.listen(port, () => {
  console.log('Server running on port ${port}');
});