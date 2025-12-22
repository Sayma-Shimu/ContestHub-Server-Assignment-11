const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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
    const contestCollection = client.db("contestHub").collection("contestUser");
    const userCollection = client.db("contestHub").collection("users");
    const registrationCollection = client.db("contestHub").collection("registrations");



    app.get('/approved-contests', async (req, res) => {
      const type = req.query.type;
      const limit = parseInt(req.query.limit) || 10;
      const skip = parseInt(req.query.skip) || 0;

      let query = { status: "confirmed" };
      if (type && type !== "All") {
        query.contestType = type;
      }

      try {
        const total = await contestCollection.countDocuments(query);
        const result = await contestCollection.find(query)
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          contests: result,
          totalCount: total
        });
      } catch (error) {
        res.status(500).send({ message: "Error fetching contests" });
      }
    });

    app.get('/approved-contests/:id', async (req, res) => {
      const contestId = req.params.id;

      try {
        const contest = await contestCollection.findOne({
          _id: new ObjectId(contestId),
          status: "confirmed"
        });

        if (!contest) {
          return res.status(404).send({ message: "Contest not found" });
        }

        res.send(contest);
      } catch (error) {
        res.status(500).send({ message: "Error fetching the contest" });
      }
    });

    app.get('/popular-contests', async (req, res) => {
      try {
        const result = await contestCollection
          .find({ status: "confirmed" })
          .sort({ participantsCount: -1 })
          .limit(5)
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: 'Error fetching popular contests' });
      }
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      try {
        const existingUser = await userCollection.findOne({ email: user.email });
        if (existingUser) {
          return res.status(400).send({ message: "User with this email already exists" });
        }

        const result = await userCollection.insertOne(user);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Error adding user" });
      }
    });

    app.get('/users', async (req, res) => {
      try {
        const result = await userCollection.find({}).toArray();
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching users" });
      }
    });

    app.patch('/users/:email', async (req, res) => {
    const email = req.params.email;
    const { name, photo, bio, address } = req.body;
    
    try {
        const filter = { email: email };
        const updateDoc = {
            $set: {
                name: name,
                photo: photo,
                bio: bio,       
                address: address 
            },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
    } catch (error) {
        res.status(500).send({ message: "Error updating user" });
    }
});

    app.get('/registrations', async (req, res) => {
      try {
        const result = await registrationCollection.find({}).toArray();
        res.status(200).send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching registrations" });
      }
    });

    app.post('/registrations', async (req, res) => {
      try {
        const registrationData = req.body;

        registrationData.registeredAt = new Date();

        const result = await registrationCollection.insertOne(registrationData);

        await contestCollection.updateOne(
          { _id: new ObjectId(registrationData.contestId) },
          { $inc: { participantsCount: 1 } }
        );

        res.status(201).send(result);
      } catch (error) {
        console.error('Error saving registration:', error);
        res.status(500).send({ message: "Failed to register for contest" });
      }
    });

    app.patch('/registrations/:id', async (req, res) => {
      const { id } = req.params;
      const { submissionText } = req.body;

      if (!submissionText) {
        return res.status(400).send({ message: 'Submission text is required' });
      }

      try {
        const result = await registrationCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              submissions: {
                submissionText,
                submittedAt: new Date(),
              }
            }
          }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).send({ message: 'Registration not found or no changes made' });
        }

        res.status(200).send({ message: 'Task submission successful' });
      } catch (error) {
        console.error('Error updating registration:', error);
        res.status(500).send({ message: 'Error submitting task' });
      }
    });

    console.log("MongoDB connected successfully");
  } finally { }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('ContestHub Server Running');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
