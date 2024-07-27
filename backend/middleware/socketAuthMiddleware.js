const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.headers.authorization;

  if (!token) {
    return next(new Error("Authentication error"));
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return next(new Error("Authentication error"));
    }

    try {
      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return next(new Error("User not found"));
      }
      socket.user = user;
      next();
    } catch (error) {
      return next(new Error("Authentication error"));
    }
  });
};

module.exports = socketAuthMiddleware;
