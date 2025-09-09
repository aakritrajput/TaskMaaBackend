import mongoose from "mongoose"
import { Schema } from "mongoose"

const chatSchema = new Schema({
    isGroupChat: {
        type: Boolean,
        default: false,
    },

    // users in the chat
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        }
    ],

    // Last message in the chat
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
    },

    // Only for group chats
    groupName: {
        type: String, 
        trim: true,
    },
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
}, {timestamps: true})

export const Chat = mongoose.Model("Chat", chatSchema)