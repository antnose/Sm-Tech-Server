const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const sgMail = require("@sendgrid/mail");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 9000;
const app = express();
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://sm-tech-1.netlify.app",
  ],
  credentials: true,
  optionSuccessStatus: 200,
};

// All Middleware here
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

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
    // Send a ping to confirm a successful connection
    await client.connect();

    // ------------------SendGrid start ------------------
    // Contact endpoint
    app.post("/api/contact", async (req, res) => {
      try {
        const { name, email, subject, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
          return res.status(400).json({
            error: "Name, email, and message are required",
          });
        }

        const msg = {
          to: process.env.TO_EMAIL,
          from: process.env.FROM_EMAIL,
          replyTo: email,
          subject: subject || `New message from ${name}`,
          text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
          html: `
        <div style="font-family: Arial; max-width: 600px;">
          <h2 style="color: #07a698;">New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Message:</strong></p>
          <div style="padding: 10px; background: #f5f5f5;">
            <p style="white-space: pre-line;">${message}</p>
          </div>
        </div>
      `,
        };

        await sgMail.send(msg);
        res.json({
          success: true,
          message: "Email sent successfully!",
        });
      } catch (error) {
        console.error("SendGrid error:", error.response?.body || error);
        res.status(500).json({ error: "Failed to send message" });
      }
    });
    //----------------  SendGrid End -----------------

    // -------------------- DB Collection ---------------
    const coursesCollection = client.db("SMTech").collection("courses");
    const departmentCollection = client.db("SMTech").collection("department");
    const userCollection = client.db("SMTech").collection("user");
    const studentCollection = client.db("SMTech").collection("students");
    const teacherCollection = client.db("SMTech").collection("teacher");
    const eventsCollection = client.db("SMTech").collection("events");

    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email };
      const result = await userCollection.findOne(query);
      if (!result || result?.role !== "admin")
        return res
          .status(403)
          .send({ message: "forbidden access ! admin only action" });

      next();
    };

    // auth related apis
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
      } catch (err) {
        res.status(500).send(err);
      }
    });

    // save user data in db
    app.post("/users/:email", async (req, res) => {
        
      const email = req.params.email;
      const query = { email };
      const user = req.body;
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send(isExist);
      }
      const result = await userCollection.insertOne({
        ...user,
        role: "user",
      });
      res.send(result);
    });
    // get all user
    app.get("/users",verifyToken,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
    // update User Role
    app.patch("/users/:id/role",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const newRole = req.body.role;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = { $set: { role: newRole } };

      try {
        const result = await userCollection.updateOne(filter, updateDoc);
        if (result.modifiedCount > 0) {
          res.send({ success: true });
        } else {
          res.status(400).send({
            success: false,
            message: "Role update failed",
          });
        }
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/users/role/:email",verifyToken, async (req, res) => {
      
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send({ role: result?.role });
    });

    // Get All Course Data from Database
    app.get("/course", async (req, res) => {
      const result = await coursesCollection.find().toArray();
      res.send(result);
    });

    // get course category wise
    app.get("/course/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const result = await coursesCollection.find(query).toArray();
      res.send(result);
    });

    // Get specific Course Data from Database
    app.get("/course/details/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.findOne(query);
      res.send(result);
    });

    // get all departments
    app.get("/department", async (req, res) => {
      const result = await departmentCollection.find().toArray();
      res.send(result);
    });

    app.get("/department/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await departmentCollection.findOne(query);
      res.send(result);
    });
    // Create a course in Database
    app.post("/course", verifyToken, verifyAdmin, async (req, res) => {
      const courseData = req.body;
      console.log(courseData);
      const result = await coursesCollection.insertOne(courseData);
      res.send(result);
    });

    // Create a Department
    app.post("/department", verifyToken, verifyAdmin, async (req, res) => {
      const departmentData = req.body;
      const result = await departmentCollection.insertOne(departmentData);
      res.send(result);
    });
    // Add Teacher
    app.post("/teachers", verifyToken, verifyAdmin, async (req, res) => {
      const teacherData = req.body;
      const result = await teacherCollection.insertOne(teacherData);
      res.send(result);
    });

    // add events 
    app.post("/events",verifyToken,verifyAdmin,async(req,res)=>{
      const eventData = req.body;
      const result = await eventsCollection.insertOne(eventData)
      res.send(result)
    })
    app.get("/events",async(req,res)=>{
      const result = await eventsCollection.find().toArray()
      res.send(result)
    })
    app.delete("/events/:id",verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await eventsCollection.deleteOne(query)
      res.send(result)
    })

    // Get Teacher
    app.get("/teachers", async (req, res) => {
      const result = await teacherCollection.find().toArray();
      res.send(result);
    });
    // Get a single teacher by ID
    app.get("/teachers/:id", async (req, res) => {
      const id = req.params.id;
      const teacher = await teacherCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(teacher);
    });

    // Update a teacher by ID
    app.put("/teachers/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      const result = await teacherCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.send(result);
    });

    // Update course details in Database
    app.put("/updateCourse/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const courseData = req.body;
      const query = { _id: new ObjectId(id) };
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

    // Update Department
    app.put(
      "/updateDepartment/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const updateData = req.body;
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
          $set: {
            ...updateData,
          },
        };
        const result = await departmentCollection.updateOne(
          query,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    // Delete course from Database
    app.delete("/course/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await coursesCollection.deleteOne(query);
      res.send(result);
    });

    // Delete Department from Database
    app.delete(
      "/department/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await departmentCollection.deleteOne(query);
        res.send(result);
      }
    );
    // Delete Specific Teacher
    app.delete("/teachers/:id",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await teacherCollection.deleteOne(query);
      res.send(result);
    });

    // Student Part Start

    // Get All student from db
    app.get("/student",verifyToken,verifyAdmin, async (req, res) => {
      const result = await studentCollection.find().toArray();
      res.send(result);
    });

    // Get a specific student from db
    app.get("/student/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentCollection.findOne(query);
      res.send(result);
    });

    // Add A student in db
    app.post("/student",verifyToken,verifyAdmin, async (req, res) => {
      const studentData = req.body;
      const result = await studentCollection.insertOne(studentData);
      res.send(result);
    });

    // Update Student Info
    app.put("/student/:id",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const studentData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...studentData,
        },
      };
      const result = await studentCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // get student based on search
    app.get("/stu/:studentId", async (req, res) => {
      const studentId = req.params.studentId;

      const result = await studentCollection.findOne({
        studentId: studentId, // <-- searches by `studentId` field
      });

      if (!result) {
        return res.status(404).json({ message: "Student not found" });
      }

      res.json(result);
    });

    // Delete A Student in db
    app.delete("/student/:id",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await studentCollection.deleteOne(query);
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
