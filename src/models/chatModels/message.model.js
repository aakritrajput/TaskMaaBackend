import mongoose from "mongoose";
import { Schema } from "mongoose";

const messageSchema = new Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }, 
    chat: {
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
        enum: ['sent', 'queued', 'delievered', 'seen'],
        default: 'sent,'
    },
    // only for group chats
    seenBy: {
        type: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ], 
        default: [],
    }
}, {timestamps: true})

export const Message = mongoose.model("Message", messageSchema)