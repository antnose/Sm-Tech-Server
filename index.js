const { MongoClient, ServerApiVersion } = require("mongodb");
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

const uri =
  "mongodb+srv://asdf:asdf@cluster0.to58y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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

    const coursesCollection = client.db("SM Tech").collection("courses");

    app.get("/electrical", async (req, res) => {
      res.send("This is electrical Department");
    });

    app.get("/mechanical", async (req, res) => {
      res.send("This is mechanical Department");
    });

    app.get("/civil", async (req, res) => {
      res.send("This is civil Department");
    });

    app.get("/computer", async (req, res) => {
      res.send("This is computer Department");
    });

    app.get("/textile", async (req, res) => {
      res.send("This is textile Department");
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
