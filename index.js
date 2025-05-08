require("dotenv").config();
const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 9000;
const app = express();
const morgan = require("morgan");

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get('/',(req,res)=>{
  res.send('Hello from SM TECH Server')
})

app.listen(port,()=>{
  console.log("SM Tech is Running on port : ",port)
})
