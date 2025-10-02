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
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
            role: {
                type: String,
                enum: ['participant' , 'admin'],
                default: 'participant',
            }
        }
    ],

    // Last message in the chat
    lastMessage: {
        text: String,
        senderId: String,
        timestamp: String,
        default: '',
    },

    // Only for group chats
    groupName: {
        type: String,
        trim: true,
    },
}, {timestamps: true})

export const Chat = mongoose.Model("Chat", chatSchema)