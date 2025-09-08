import mongoose, {Schema} from "mongoose";

const statsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one stats document per user
    },
    tasksCompleted: {
      type: Number,
      default: 0,
    },
    tasksPending: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    overallScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stats", statsSchema);
