import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";

import auth from "./middleweare/auth.js";
dotenv.config();

const app = express();
app.use(cors())
app.use(express.json());

// Create a hashed password (normally this comes from your database)
const hashedPassword = await bcrypt.hash("1234567", 10);

const user =  {
    email: "test@gmail.com",
    password: hashedPassword,
};

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
    
  if (email !== user.email) {
    return res.status(401).json({
      message: "Invalid Credentials",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid Credentials",
    });
  }
  const token = jwt.sign(
    {
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );

  return res.status(200).json({
    message: "Login Successful",
    token,
  });
});
app.post("/register", async (req,res)=>{
    const { email, password } = req.body;

  // Check if user already exists
  const existingUser = user.find((users) => users.email === email);

  if (existingUser) {
    return res.status(400).json({
      message: "User already exists",
    });
  }
   // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Save user
  user.push({
    email,
    password: hashedPassword,
  });

  return res.status(201).json({
    message: "Registration Successful",
  });
})
app.get("/profile", auth, (req, res) => {
   res.json({
    message: "Profile fetched successfully",
    user: req.user,
  });
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
