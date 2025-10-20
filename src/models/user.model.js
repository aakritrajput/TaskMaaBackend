import mongoose, {Schema} from "mongoose"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    profileType:{
      type: String,
      enum: ['public', 'private'],
      default: 'private'
    },
    profilePicture: {
      type: String,
      default: "",
    },
    about: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    friends: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User'
        },
      ],
      default: [],
    },
    requests: {
      type: [
         {
           userId: {
             type: Schema.Types.ObjectId,
             ref: 'User'
           },
           sentOrRecieved: {
             type: String,
             enum: ['sent', 'recieved'],
             required: true,
           }
         }
       ],
       default: [],
    },

    // stat fields

    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    overallScore: {
      type: Number,
      default: 0,
    },
    weeklyProgress: {
      type: [Number],
      default: [0,0,0,0,0,0,0],
    },
    badges: {
      type: [String],
      default: [],
    },

    // Things required in chat feature
    
    unreadMessages: {  //  total unread across all chats
      type: Number, 
      default: 0 
    },
    lastOnline: { type: Date },
    lastStreakOn: {type: String}, // we will just store date
  },
  { timestamps: true }
);

userSchema.pre("save", async function(next){
    if(this.isModified("hashedPassword")){
        this.hashedPassword = await bcrypt.hash(this.hashedPassword, 10) // if the hashed password is changed so before saving it hash the new password !!
    }
    next()
})

userSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.hashedPassword)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign({_id: this._id, email: this.email, username: this.username, profileType: this.profileType , name: this.name, profilePicture: this.profilePicture}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: process.env.ACCESS_TOKEN_EXPIRY})
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({_id: this._id}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: process.env.REFRESH_TOKEN_EXPIRY})
}

userSchema.methods.generateAccessToken

export const User = mongoose.model("User", userSchema)