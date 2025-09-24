import mongoose, {Schema} from "mongoose";

const statsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one stats document per user
    },
    dailytasksCompleted: {
      type: Number,
      default: 0,
    },
    generaltasksCompleted: {
      type: Number,
      default: 0,
    },
    totaldailyTasks: {
      type: Number,
      default: 0,
    },
    totalgeneralTasks: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 1,
    },
    overallScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stats", statsSchema);
