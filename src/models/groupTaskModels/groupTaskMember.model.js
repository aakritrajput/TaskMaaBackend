import mongoose from "mongoose";
import { Schema } from "mongoose";

const groupTaskMemberSchema = new Schema({
    groupTaskId: { 
      type: Schema.Types.ObjectId, 
      ref: "GroupTask", 
      required: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    status: { 
      type: String, 
      enum: ["invited", "accepted", "declined"],
      default: "invited" 
    },
    role: { 
      type: String, 
      enum: ["admin", "participant"], 
      default: "participant" 
    },
    completionStatus: { 
      type: String, 
      enum: ["in_progress", "completed"],
      default: "in_progress"
    },
    completedAt: { type: Date },
    rank: { type: Number }, // completion order
    joinedAt: { 
      type: Date, 
      default: Date.now 
    },
});

export const GroupTaskMember =  mongoose.model("GroupTaskMember", groupTaskMemberSchema);