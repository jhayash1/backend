import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import auth from "./middleweare/auth.js";
import Order from "./models/Order.js";
import Cart from "./models/Cart.js";
import cookieParser from "cookie-parser";

import nodemailer from "nodemailer";
import profileRoutes from "./routes/profileRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import connectDB from "./db/db.js";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dotenv.config();


const app = express();
app.use(
  cors({
    origin: "https://frontend-e-commerce-lac.vercel.app",
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json());

connectDB()

// Create a hashed password (normally this comes from your database)
const hashedPassword = await bcrypt.hash("1234567", 10);
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const transporter = nodemailer.createTransport({
  service: "gmail",

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
app.use("/", authRoutes); // Login route
app.use("/", profileRoutes); //Profile route

app.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
});

app.post("/place-order", auth, async (req, res) => {
  try {
    const { items, total, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        message: "Shipping address is required",
      });
    }

    const options = {
      amount: Math.round(total * 100), // Convert to paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    console.log("Razorpay Order:", razorpayOrder);

    return res.status(201).json({
      message: "Order created successfully",
      shippingAddress,
      items,
      total,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Payment order creation failed",
    });
  }
});
app.post("/cart", auth, async (req, res) => {
  try {
    const { items } = req.body;

    const userId = req.user.userId;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await Cart.create({
        userId,
        items,
      });
    } else {
      for (const newItem of items) {
        const existingItem = cart.items.find((item) => item.id === newItem.id);

        if (existingItem) {
          existingItem.quantity += newItem.quantity;
        } else {
          cart.items.push(newItem);
        }
      }

      await cart.save();
    }

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    console.error("Cart Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product to cart",
    });
  }
});
app.get("/cart", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ userId });

    return res.status(200).json({
      success: true,
      cart: cart || { items: [] },
    });
  } catch (error) {
    console.error("Get Cart Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
});
app.delete("/cart/:itemId", auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const itemId = req.params.itemId;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter((item) => item.id !== parseInt(itemId));
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Item removed from cart",
      cart,
    });
  } catch (error) {
    console.error("Delete Cart Item Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove item from cart",
    });
  }
});
// app.put("/cart/increment/:itemId", auth, async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const itemId = Number(req.params.itemId);

//     const cart = await Cart.findOne({ userId });

//     if (!cart) {
//       return res.status(404).json({
//         success: false,
//         message: "Cart not found",
//       });
//     }

//     const item = cart.items.find(
//       (item) => Number(item.id) === itemId
//     );

//     if (!item) {
//       return res.status(404).json({
//         success: false,
//         message: "Item not found",
//       });
//     }

//     item.quantity += 1;

//     await cart.save();

//     res.json({
//       success: true,
//       cart,
//     });
//   } catch (error) {
//     console.error("Increment error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to increase quantity",
//     });
//   }
// });
app.post("/verify-payment", auth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      items,
      total,
      shippingAddress,
    } = req.body;
    console.log("Authenticated user:", req.user);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment details are missing",
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
    // 2. Payment verified
    console.log("Payment verified");

    // 3. Save order in MongoDB
    const order = await Order.create({
      userId: req.user.userId,
      userEmail: req.user.email,

      items,
      total,
      shippingAddress,

      razorpayOrderId: razorpay_order_id,

      razorpayPaymentId: razorpay_payment_id,

      paymentStatus: "paid",

      orderStatus: "Completed",
    });
    // Remove user's cart after successful payment
    await Cart.findOneAndDelete({
      userId: req.user.userId,
    });
    console.log("Order saved:", order);

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: req.user.email,
      subject: "Order Confirmed 🎉",

      html: `
    <h2>Payment Successful!</h2>

    <p>Hello ${shippingAddress.name},</p>

    <p>Your order has been successfully placed.</p>

    <p><strong>Order ID:</strong> ${razorpay_order_id}</p>

    <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>

    <p><strong>Total:</strong> ₹${total}</p>

    <p><strong>Payment Status:</strong> Paid</p>

    <p><strong>Order Status:</strong> Completed</p>

    <br />

    <p>Thank you for shopping with us.</p>
  `,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Verification Error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});
//read
app.get("/orders", auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      userEmail: req.user.email,
    }).sort({
      createdAt: -1,
    });
    console.log("Found order:", order);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "No order found",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get Orders Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
    });
  }
});

app.listen(4000, () => {
  console.log("Server running on port 4000");
});
