import mongoose from "mongoose";
import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { userPlateFromCache, userPlateToCache } from "../cache/user.cache.js";

const register = async(req, res) => {
    try {
        const {username, email, password, confirmPassword} = req.body
        const existingUser = await User.find({
            $or: [
                { email },
                { username }
            ]
        })

        if(existingUser.length > 0){
            console.log(existingUser)
            throw new ApiError(400, "user already exists with the given username or email!!")
        }

        const user = await User.create({
            username,
            email,
            password,
        })

        if(!user){
            throw new ApiError(500, "There was a problem creating user on the backend!!")
        }
        // for now we are skipping the varification part we will do that later on !! 

        const createdUser = await User.findById(user._id).select("-password")
        res.status(200).json(new ApiResponse(201, createdUser, "User created successfully !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "Error registering user !!"})
    }
}

const login = async(req, res) => {
    try {
        let {email, password} = req.body
        if(!email || !password){
            throw new ApiError(400, "Please Provide all required credentials - 'email' and 'password' ")
        }
        const user = await User.findOne({email})
        if(!user){
            throw new ApiError(404, "No user exists with this email, Please register first !!")
        }
        const isPasswordCorrect = await user.comparePassword(password)
        if(!isPasswordCorrect){
            throw new ApiError(400, "Incorrect Password, please enter correct password !!")
        }

        const accessToken = user.generateAccessToken()
        if(!accessToken){
            throw new ApiError(500, "Error generating access token !!")
        }

        const refreshToken = user.generateRefreshToken()
        if(!refreshToken){
            throw new ApiError(500, "Error generatig refresh token !!")
        }

        const { hashedPassword, ...safeUser } = user.toObject();

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        }

        res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(new ApiResponse(200, safeUser, "Successfully logged in !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'Error logging in !!'})
    }
}

const authCheck = (req, res) =>{
    if (req.user){
        const user = req.user
        res.status(200).json(new ApiResponse(200, {user}, "User "))
    }else{
        res.status(401).json({message: 'unAuthenticated Request'})
    }
}

const sendFriendRequest = async(req, res) => {
    try {
        const userId = req.user._id // user who wants to send the request !!
        const { friendId } = req.params // user to whome we want to send the friend request !!

        if (!friendId){
            throw new ApiError(400, "Please provide the user ID of the person you want to send the request to..")
        }

        const session = await mongoose.startSession()
        try {
            session.startTransaction()
            await User.bulkWrite([
                {
                    updateOne: {
                        filter: {_id: userId},
                        update: { $addToSet: { requests: { userId: friendId, sentOrRecieved: 'sent' } } } // -- here i am using addToSet in place of $push as it will not push if duplicate !! // sent here for friend's document who sent the friend request !!
                    }
                },
                {
                    updateOne: {
                        filter: { _id: friendId},
                        update: { $addToSet: {requests: {userId, sentOrRecieved: 'recieved'}}}, // recieved here for current users document 
                    }
                }
            ], {session})
    
            await session.commitTransaction()
            //TODO: here we can implement the notification in future 
            res.status(200).json(new ApiResponse(200, {},"Friend Request sent successfully !!"))
        } catch (error) {
            await session.abortTransaction()
            res.status(500).json({message: error.message || "Error sending friend request to the given user !!"})
        }finally{
            session.endSession()
        }

    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "Error sending friend request to the given user !!"})
    }
}

const responseToFriendRequest = async(req, res) => {
    try {
        const userId = req.user._id
        const { friendId } = req.params
        const {response} = req.body // 'accepted' or 'rejected'
        if (!friendId){
            throw new ApiError(400, "Please provide the user ID of the person whose request you are handling !!")
        }
        if (!response || !['accepted', 'rejected'].includes(response)) {
            throw new ApiError(400, "No response provided -- either accepted to rejected ?")
        }

        const session = await mongoose.startSession()
        try {
            session.startTransaction()
            const result = response == 'accepted' ? await User.bulkWrite([
                {
                    updateOne: {
                        filter: {_id: userId},
                        update: { 
                            $addToSet: { friends: friendId },
                            $pull: {requests: {userId: friendId, sentOrRecieved: 'recieved'}},
                        },
                    }
                },
                {
                    updateOne: {
                        filter: { _id: friendId},
                        update: { 
                            $addToSet: {friends: userId},
                            $pull: {requests: {userId: userId, sentOrRecieved: 'sent'}}
                        }, 
                    }
                }
            ], {session})
    
            :
        
            await User.bulkWrite([
                {
                    updateOne: {
                        filter: {_id: userId},
                        update: {
                            $pull: {requests: {userId: friendId}},
                        },
                    }
                },
                {
                    updateOne: {
                        filter: { _id: friendId},
                        update: { 
                            $pull: {requests: {userId: userId}}
                        }, 
                    }
                }
            ], {session})
    
            //TODO: here we can implement the notification in future 

            await session.commitTransaction()
    
            res.status(200).json(new ApiResponse(200, {}, "Friend Request sent successfully !!"))
       } catch (error) {
            await session.abortTransaction()
            res.status(500).json({message: error.message || "Error responding to friend request of the given user !!"})
        }finally{
            session.endSession()
        }
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "Error responding to friend request of the given user !!"})
    }
}

const searchByUsername = async(req, res) => {
    try {
        const {username} = req.query
        if(!username){
            throw new ApiError(400, "Please provide a username to search !!")
        }
        
        const usertFromCache = await userPlateFromCache(username)
        if(resultFromCache){
            res.status(200).json(new ApiResponse(200, resultFromCache, "Successfully Searched !!"))
        }

        const userFromDatabase = await User.findOne({username: username}).select("username name profilePicture").lean()

        if(!userFromDatabase){
            throw new ApiError(404, "User not found with this username !!")
        }

        await userPlateToCache(username, userFromDatabase)

        res.status(200).json(new ApiResponse(200, userFromDatabase, "Here is the user with given username !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error searching the user with the given username !!" })
    }
}

export {
    register, 
    login,
    authCheck,
    sendFriendRequest,
    responseToFriendRequest,
    searchByUsername
}