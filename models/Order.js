import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    items: [
      {
        id: Number,
        title: String,
        price: Number,
        image: String,
        quantity: Number,
      },
    ],

    total: {
      type: Number,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    shippingAddress: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
    },

    razorpayOrderId: String,

    razorpayPaymentId: String,

    paymentStatus: {
      type: String,
      default: "pending",
    },

    orderStatus: {
      type: String,
      default: "Processing",
    },
    userEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Order", orderSchema);
