const jwt = require('jsonwebtoken');
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");

const authenticateToken = (socket, next) => {
    const token = socket.handshake.headers.token;
  
    if (!token) {
      return next(new Error('Authentication error'));
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return next(new Error('Authentication error'));
      }
      socket.user = user;
      next();
    });
};

const socketHandler = (io) => {
    io.use(authenticateToken);
  
    io.on("connection", (socket) => {
      console.log("Connected to socket.io");
  
      socket.on("setup", (userData) => {
        socket.join(socket.user.id);
        console.log("Connected User ID: ", socket.user.id);
        socket.emit("connected");
      });
  
      socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
      });
  
      socket.on("typing", (room) => socket.in(room).emit("typing"));
      socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));
  
      socket.on("new message", async (newMessageReceived) => {
        var chat = newMessageReceived.chat;
  
        if (!chat.users) return console.log("chat.users not defined");
  
        try {
          var newMessage = {
            sender: newMessageReceived.sender._id,
            content: newMessageReceived.content,
            chat: newMessageReceived.chat._id,
          };
  
          var message = await Message.create(newMessage);
  
          message = await message.populate("sender", "name pic");
          message = await message.populate("chat");
          message = await User.populate(message, {
            path: "chat.users",
            select: "name pic email",
          });
  
          await Chat.findByIdAndUpdate(newMessageReceived.chat._id, { latestMessage: message });
  
          chat.users.forEach((user) => {
            if (user._id == newMessageReceived.sender._id) return;
            socket.in(user._id).emit("message received", message);
          });
        } catch (error) {
          console.error(error);
        }
      });

      socket.on("fetch all messages", async (chatId) => {
        try {
          const messages = await Message.find({ chat: chatId })
            .populate("sender", "name pic email")
            .populate("chat");
          socket.emit("all messages", messages);
        } catch (error) {
          console.error(error);
          socket.emit("chat error", error.message);
        }
      });
  
      socket.on("access chat", async ({ userId, currentUserId }) => {
        if (!userId) {
          console.log("UserId param not sent with request");
          return socket.emit("chat error", "UserId param not sent with request");
        }
  
        try {
          var isChat = await Chat.find({
            isGroupChat: false,
            $and: [
              { users: { $elemMatch: { $eq: currentUserId } } },
              { users: { $elemMatch: { $eq: userId } } },
            ],
          })
            .populate("users", "-password")
            .populate("latestMessage");
  
          isChat = await User.populate(isChat, {
            path: "latestMessage.sender",
            select: "name pic email",
          });
  
          if (isChat.length > 0) {
            socket.emit("access chat", isChat[0]);
          } else {
            var chatData = {
              chatName: "sender",
              isGroupChat: false,
              users: [currentUserId, userId],
            };
  
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
              "users",
              "-password"
            );
            socket.emit("access chat", FullChat);
          }
        } catch (error) {
          console.error(error);
          socket.emit("chat error", error.message);
        }
      });
  
      socket.on("fetch chats", async (currentUserId) => {
        try {
          Chat.find({ users: { $elemMatch: { $eq: currentUserId } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
              results = await User.populate(results, {
                path: "latestMessage.sender",
                select: "name pic email",
              });
              socket.emit("fetch chats", results);
            });
        } catch (error) {
          console.error(error);
          socket.emit("chat error", error.message);
        }
      });
  
      socket.on("create group", async ({ name, users, currentUser }) => {
        if (!users || !name) {
          return socket.emit("chat error", "Please fill all the fields");
        }
  
        if (users.length < 2) {
          return socket.emit(
            "chat error",
            "More than 2 users are required to form a group chat"
          );
        }
  
        users.push(currentUser);
  
        try {
          const groupChat = await Chat.create({
            chatName: name,
            users: users,
            isGroupChat: true,
            groupAdmin: currentUser,
          });
  
          const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");
  
          socket.emit("group created", fullGroupChat);
        } catch (error) {
          console.error(error);
          socket.emit("chat error", error.message);
        }
      });
  
      socket.on("rename group", async ({ chatId, chatName }) => {
        const updatedChat = await Chat.findByIdAndUpdate(
          chatId,
          {
            chatName: chatName,
          },
          {
            new: true,
          }
        )
          .populate("users", "-password")
          .populate("groupAdmin", "-password");
  
        if (!updatedChat) {
          socket.emit("chat error", "Chat Not Found");
        } else {
          socket.emit("group renamed", updatedChat);
        }
      });
  
      socket.on("remove from group", async ({ chatId, userId }) => {
        const removed = await Chat.findByIdAndUpdate(
          chatId,
          {
            $pull: { users: userId },
          },
          {
            new: true,
          }
        )
          .populate("users", "-password")
          .populate("groupAdmin", "-password");
  
        if (!removed) {
          socket.emit("chat error", "Chat Not Found");
        } else {
          socket.emit("user removed", removed);
        }
      });
  
      socket.on("add to group", async ({ chatId, userId }) => {
        const added = await Chat.findByIdAndUpdate(
          chatId,
          {
            $push: { users: userId },
          },
          {
            new: true,
          }
        )
          .populate("users", "-password")
          .populate("groupAdmin", "-password");
  
        if (!added) {
          socket.emit("chat error", "Chat Not Found");
        } else {
          socket.emit("user added", added);
        }
      });
  
      socket.off("setup", () => {
        console.log("USER DISCONNECTED");
        socket.leave(socket.user.id);
      });
    });
};

module.exports = socketHandler;
