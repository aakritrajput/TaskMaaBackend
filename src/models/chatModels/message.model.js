import mongoose from "mongoose";
import { Schema } from "mongoose";

const messageSchema = new Schema({
    id: {
        type: String,
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    receiverId: { // for one to one chat 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true,
    },
    content: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['sent', 'delievered', 'seen'],
        default: 'sent'
    },
    timestamp: {
        type: Date,
        default: Date.now(),
    },

    // only for group chats
    deliveredTo: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ], 
        default: [],
    },
    readBy: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ], 
        default: [],
    }
})

export const Message = mongoose.model("Message", messageSchema)