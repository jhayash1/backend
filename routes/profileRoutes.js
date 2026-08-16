import express from "express";
import {profile} from "../controller/profileController.js";
import auth from "../middleweare/auth.js";

const router = express.Router();    

router.get("/profile",auth, profile);

export default router;