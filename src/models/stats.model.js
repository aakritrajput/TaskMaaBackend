import mongoose, {Schema} from "mongoose";

const statsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one stats document per user
    },
    profileType:{  // this is written here so that we do not need to perform deep aggregation on users table for selecting only public profiles
      type: String,
      enum: ['public', 'private'],
      default: 'private'
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
    badges: {
      type: [Number],
      default: [],
    }
  },
  { timestamps: true }
);

statsSchema.index({userId: 1})

export const Stats = mongoose.model("Stats", statsSchema);
