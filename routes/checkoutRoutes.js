import express from "express";
import { checkout } from "../controller/checkoutController.js";
import auth from "../middleweare/auth.js";
const router = express.Router();

router.post("/checkout",auth, checkout);

export default router;