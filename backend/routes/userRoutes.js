const express = require("express");
const {
  signup,
  login,
  searchAllUsers,
} = require("../controllers/userControllers");
const { protect } = require("../middleware/authMiddleware");

const userRouter = express.Router();

userRouter.route("/searchAllUsers").get(protect, searchAllUsers);
userRouter.route("/signup").post(signup);
userRouter.post("/login", login);

module.exports = userRouter;
