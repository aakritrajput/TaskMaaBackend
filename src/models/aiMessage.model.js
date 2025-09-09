import mongoose from "mongoose";
import { Schema } from "mongoose";

const aiMessageSchema = new Schema({
    userId: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    }, // AI-generated message
    taskId: { 
        type: Schema.Types.ObjectId, // optional -- as this can be usefull if want to show maa's messages for a particular task
        ref: "Task" 
    }, 
    groupTaskId: { 
        type: Schema.Types.ObjectId, // optional -- same, as if we want to show maa's messages for specific task
        ref: "GroupTask" 
    },
}, { timestamps: true });

export const AiMessage = mongoose.model("AIMessage", aiMessageSchema);
