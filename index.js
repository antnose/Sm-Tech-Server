const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 9000;
const app = express();
const morgan = require("morgan");

// All Middleware here
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.to58y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    
    const coursesCollection = client.db("SMTech").collection("courses");
    const departmentCollection = client.db("SMTech").collection("department");
    const userCollection = client.db("SMTech").collection("user");

    // save data in db
    app.post('/users/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email}
      const user = req.body;
      const isExist = await userCollection.findOne(query)
      if(isExist){
        return res.send(isExist)
      }
      const result = await userCollection.insertOne({
        ...user,
        role:"student"
      })
      res.send(result)

    })



    // Get All Course Data from Database
    app.get("/course", async (req, res) => {
      const result = await coursesCollection.find().toArray();
      res.send(result);
    });

    // Get specific Course Data from Database
    app.get("/course/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.findOne(query);
      res.send(result);
    });

    // get all departments
    app.get('/department',async(req,res)=>{
      const result = await departmentCollection.find().toArray()
      res.send(result)
    })


    // Create a course in Database
    app.post("/course", async (req, res) => {
      const courseData = req.body;
      console.log(courseData);
      const result = await coursesCollection.insertOne(courseData);
      res.send(result);
    });

    // Create a Department
    app.post("/department",async(req,res)=>{
      const departmentData = req.body;
      const result = await departmentCollection.insertOne(departmentData)
      res.send(result)
    })


    // Update course details in Database
    app.put("/course/:id", async (req, res) => {
      const category = req.params.category;
      const courseData = req.body;
      const query = { category: category };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...courseData,
        },
      };
      const result = await coursesCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Delete course from Database
    app.delete("/course/:id", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await coursesCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from SM TECH Server");
});

app.listen(port, () => {
  console.log("SM Tech is Running on port : ", port);
});
