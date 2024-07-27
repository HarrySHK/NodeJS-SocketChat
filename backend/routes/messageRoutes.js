const express = require("express");
const {
  fetchAllMessages,
  sendMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const messageRouter = express.Router();

messageRouter.route("/fetchAllMessages").get(protect, fetchAllMessages);
messageRouter.route("/sendMessage").post(protect, sendMessage);

module.exports = messageRouter;
