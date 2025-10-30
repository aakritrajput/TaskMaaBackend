import mongoose from "mongoose"
import { Schema } from "mongoose"

const chatSchema = new Schema({
    isGroupChat: {
        type: Boolean,
        default: false,
    },

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

    uniquePairKey: { // for one to one chats 
        type: String,
        unique: true,
        sparse: true // allows multiple group chats to exist
    },

    // Last message in the chat
    lastMessage: {
        text: { type: String, default: '' },
        senderId: { type: String, default: '' },
        timestamp: { type: String, default: '' },
    },

    // Only for group chats
    groupName: {
        type: String,
        trim: true,
    },
}, {timestamps: true})

export const Chat = mongoose.model("Chat", chatSchema)

chatSchema.pre("save", function (next) {
  if (!this.isGroupChat) {
    const ids = this.users.map(u => u.user.toString()).sort(); // sort to make [A,B] and [B,A] same
    this.uniquePairKey = ids.join("_");
  } else {
    this.uniquePairKey = undefined; // groups can have same members
  }
  next();
});
