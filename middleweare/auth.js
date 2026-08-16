import jwt from "jsonwebtoken";

const auth = (req, res, next) => {
  const token = req.cookies.token;

  console.log("TOKEN FROM COOKIE:", token);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("DECODED USER:", decoded);

    req.user = decoded;

    next();
  } catch (error) {
    console.error("JWT ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid Token",
    });
  }
};

export default auth;