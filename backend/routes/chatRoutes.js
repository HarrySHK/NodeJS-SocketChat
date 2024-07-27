const express = require("express");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  removeFromGroup,
  addToGroup,
  renameGroup,
} = require("../controllers/chatControllers");
const { protect } = require("../middleware/authMiddleware");

const chatRouter = express.Router();

chatRouter.route("/accessChat").post(protect, accessChat);
chatRouter.route("/fetchChats").get(protect, fetchChats);
chatRouter.route("/createGroupChat").post(protect, createGroupChat);
chatRouter.route("/renameGroup").put(protect, renameGroup);
chatRouter.route("/removeFromGroup").put(protect, removeFromGroup);
chatRouter.route("/addToGroup").put(protect, addToGroup);

module.exports = chatRouter;
