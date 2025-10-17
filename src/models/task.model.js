import mongoose, {Schema} from "mongoose";

const taskSchema = new Schema({
    user: { 
        type: Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    importance: { 
        type: String, 
        enum: ["low", "medium", "high"], 
        default: "medium" 
    },
    status: { 
        type: String,
        enum: ["inProgress", "completed"], 
        default: "inProgress" 
    },
    type: {
        type: String, 
        enum: ["daily", "general"], 
        default: "general" 
    },
    dueDate: { 
        type: Date,
        required: true
    },
    completedOn: {
        type: Date,
        default: undefined
    }
}, { timestamps: true });

export const Task = mongoose.model("Task", taskSchema)