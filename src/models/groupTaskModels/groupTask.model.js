import mongoose from "mongoose";
import { Schema } from "mongoose";

const groupTaskSchema = new Schema({
    title: { 
      type: String, 
      required: true 
    },
    description: { 
      type: String 
    },
    type: { 
      type: String, 
      enum: ["private", "public"], 
      default: "private" 
    },
    creatorId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    dueDate: { 
      type: Date 
    },
    importance: { 
      type: String, 
      enum: ["low", "medium", "high"], 
      default: "medium" 
    },
    status: { 
      type: String, 
      enum: ["ongoing", "completed", "overdue"], 
      default: "ongoing" 
    },
    winners: [
      { 
          type: Schema.Types.ObjectId, 
          ref: "User" 
      }
    ], // ordered list of userIds -- as listed according to the ranks
}, { timestamps: true });

export const GroupTask =  mongoose.model("GroupTask", groupTaskSchema);
