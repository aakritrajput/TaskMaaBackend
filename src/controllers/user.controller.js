import mongoose from "mongoose";
import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { addFriendsToCache, getFriendsFromCache, invalidateProfileFromCache, profileFromCache, profileToCache, removeFriendsFromCache, userPlateFromCache, userPlateToCache } from "../cache/user.cache.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const generateVerificationToken = (email) => {
    const token = jwt.sign({email}, process.env.VERIFICATION_TOKEN_SECRET , { expiresIn: process.env.VERIFICATION_TOKEN_EXPIRY });
    return token;
  };

const sendVerificationEmail = async (email, token) => {
    try {
      //api/v1/user/register/verify-token
      const verificationLink = `http://localhost:3000/auth/verifyEmail?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
      const transporter = nodemailer.createTransport({
        service: "gmail", // Use Gmail's service
        auth: {
          user: process.env.PROJECT_OWNER_EMAIL, // Project's email
          pass: process.env.PROJECT_OWNER_PASSWORD, // Project's email password
        },
      });
  
      const mailOptions = {
        from: `"TaskMaa" <${process.env.PROJECT_OWNER_EMAIL}>`, // Sender
        to: email, // Recipient
        subject: "Email Verification", // Email subject
        html: `
          <p>Hello,</p>
          <p>Please verify your email by clicking the link below:</p>
          <a href="${verificationLink}">Verify Email</a>
          <p>If you did not request this, please ignore this email.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
  
      console.log("Verification email sent successfully to:", email);
    } catch (error) {
      console.log("Failed to send verification email:", error.message);
      throw new ApiError(500, error.message || "Email sending failed. Please try again.");
    }
};

const verifyToken = async(req,res)=>{
    const {token, email} = req.query;
    const decodedToken = decodeURIComponent(token)
    const decodedEmail = decodeURIComponent(email)
    
    try {
        if(!decodedToken || !decodedEmail){
            throw new ApiError(500, "error decoding uri components")
        }
        const user = await User.find({
                email: decodedEmail
            })
        if(user.length === 0){
            throw new ApiError("error getting the user with decoded email")
        }
        const token = await jwt.verify(decodedToken, process.env.VERIFICATION_TOKEN_SECRET)
        
        if(token.email !== user[0].email){
            console.log("token.email: ", token.email, "user.email: ", user.email)
            throw new ApiError(400, "email in token does not match with the email in the database")
        }
        user[0].isVerified = true;
        await user[0].save({validateBeforeSave: false})
        res.status(200).json(new ApiResponse(200, {}, "Email successfully verified !"))
    } catch (error) {
        res.status(error.statusCode || 500).json( error.message || "verification link expired or not valid !! ")
    }
}


const resendVerificationLink = async(req, res)=> {
    try {
        const {email} = req.params
        const decodedEmail = decodeURIComponent(email)
        console.log(decodedEmail)
        const user = await User.find({email: decodedEmail})
        console.log("user:",user)
        if(user.length === 0){
            throw new ApiError(400, "No user with the given email !!")
        }
        if(user[0].isVerified ){
            throw new ApiError(400, "User with the given email is already verified")
        }
        const verificationToken = generateVerificationToken(user[0].email);
        await sendVerificationEmail(user[0].email, verificationToken);
        res.status(200).json(new ApiResponse(200, {},"verification link sent successfully"))
    } catch (error) {
        res.status(error.statusCode || 500).json( error.message || "Error Sending Verification link")
    }
}

const register = async(req, res) => {
    try {
        const {username, email, password, confirmPassword} = req.body
        if(!username || !email || !password || !confirmPassword){
            console.log("1st catch error")
            throw new ApiError(400, 'Please provide all details !!')
        }
        if(password !== confirmPassword){
            console.log("2nd catch error")
            throw new ApiError(400, 'ConfirmPassword does not matches Password !!')
        }
        const existingUser = await User.find({
            $or: [
                { email },
                { username }
            ]
        })

        if(existingUser.length > 0){
            console.log(existingUser)
            throw new ApiError(400, "User already exists with the given username or email !!")
        }

        const user = await User.create({
            username,
            email,
            hashedPassword: password,
        })

        if(!user){
            throw new ApiError(500, "There was a problem creating user on the backend!!")
        }

        const verificationToken = generateVerificationToken(email);
        await sendVerificationEmail(email, verificationToken)

        res.status(200).json(new ApiResponse(201, 'OK', "User is successfully registered. Please check your inbox for email verification !"))
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

        if(user.isVerified === false){
            throw new ApiError(402, "Your email is not verified.")
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
            maxAge: 7 * 24 * 60 * 60 * 1000, // here we are setting cookies for 7 days but obviously our access token will expire i requored time which has set so we don't need to worry as it will reset the cookie if it is expire 
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
        res.status(200).json(new ApiResponse(200, user, "Got the user !!"))
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

        const existingRequest = await User.findOne({
          _id: userId,
          'requests.userId': friendId,
        });
        
        if (existingRequest) {
          throw new ApiError(400, 'Friend request already exists, Please refresh the page to see the updated request status!');
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
                        update: { $addToSet: {requests: {userId, sentOrRecieved: 'received'}}}, // recieved here for current users document 
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

            if(response == 'accepted'){
                await removeFriendsFromCache(userId)
            }
    
            res.status(200).json(new ApiResponse(200, {}, "Friend Request responded successfully !!"))
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
        
        const userFromCache = await userPlateFromCache(username)
        if(userFromCache){
            res.status(200).json(new ApiResponse(200, userFromCache, "Successfully Searched !!"))
            return ;
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

const getUserProfile = async(req, res) => {
    try {
        const {userId} = req.params
        if(!userId){
            throw new ApiError(400, "No userId provided !!")
        }

        let dataFromCache = await profileFromCache(userId) ;
        if(dataFromCache){
            const isFriend = await checkIsMyFriend(req.user._id, userId)
            if(!isFriend){
                const {isRequested, sentOrRecieved} = await checkIsRequested(req.user._id, userId)
                dataFromCache = {...dataFromCache, isFriend, isRequested, sentOrRecieved}
            }else{
                dataFromCache = {...dataFromCache, isFriend, isRequested: false, sentOrRecieved: null};
            }

            res.status(200).json(new ApiResponse(200, dataFromCache, "Successfully got user's profile !!"));
            return ;
        }
        let dataFromDb = await User.findById(userId).select('profileType overallScore badges username longestStreak name profilePicture about').lean()
        if(!dataFromDb){
            throw new ApiError(400, "No user exist with the given userId. Please provide a valid userId")
        }

        if(dataFromDb.profileType == 'private'){
            delete dataFromDb.badges;
            delete dataFromDb.overallScore;
            delete dataFromDb.about;
            delete dataFromDb.longestStreak
        }

        await profileToCache(userId, dataFromDb);

        const isFriend = await checkIsMyFriend(req.user._id, userId)
        if(!isFriend){
            const {isRequested, sentOrRecieved} = await checkIsRequested(req.user._id, userId)
            dataFromDb = {...dataFromDb, isFriend, isRequested, sentOrRecieved}
        }else{
            dataFromDb = {...dataFromDb, isFriend, isRequested: false, sentOrRecieved: null};
        }

        res.status(200).json(new ApiResponse(200, dataFromDb, "Here is given user's profile"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "Error getting your profile !!"})
    }
}

const editProfile = async(req, res) => { // we have not created any caching function for profile as our access token already contains the profile info and the rest we are calling through seperate api's
    try {
        console.log('edit profile runs !')
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized Request !!")
        }

        const data = req.body
        const profilePicUrl = req.file ? req.file.path : null; // now these are the 4 things that use can edit and hence atleast one of them should be not null 
        console.log('data: ', data, 'profile pic url: ', profilePicUrl)
        if(!data.name && !data.profileType && !data.about && !data.profilePicUrl){
            throw new ApiError(400, "Please provide something to edit - Nothing provided !!")
        }
        let newProfilePicUrl = '';
        if(profilePicUrl){
            if(req.user.profilePicture){
                console.log('prev img delete run')
                console.log(req.user.profilePicture)
                await deleteFromCloudinary(req.user.profilePicture)
            }
            newProfilePicUrl = await uploadOnCloudinary(profilePicUrl)
        }
        let dataToUpdate = {}
        if(newProfilePicUrl){
            dataToUpdate.profilePicture = newProfilePicUrl;
        }
        for (const field of ['name', 'profileType', 'about']){
            if(data[field]){
                dataToUpdate[field] = data[field]
            }
        }

        const updatedUser = await User.findByIdAndUpdate(userId, dataToUpdate, {new: true}).select('-unreadMessages -hashedPassword -isVerified -friends -requests -unreadMessages -lastOnline')
        // can also exclude timestamps 

        const accessToken = updatedUser.generateAccessToken()
        if(!accessToken){
            throw new ApiError(500, "Error generating access token !!")
        }

        const refreshToken = updatedUser.generateRefreshToken()
        if(!refreshToken){
            throw new ApiError(500, "Error generatig refresh token !!")
        }

        await invalidateProfileFromCache(userId)

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        }

        res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(new ApiResponse(200, updatedUser, "Successfully logged in !!"))
    } catch (error) {
         res.status(error.statusCode || 500).json({message: error.message || "There was some error deleting your account" })
    }
}

const deleteAccountHandler = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized Request !!")
        }

        await User.findByIdAndDelete(userId)
           
        res.clearCookie('accessToken', { httpOnly: true, secure: true, sameSite: 'None' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: true, sameSite: 'None' });
        res.status(200).json(new ApiResponse(200, 'OK', "Successfully deleted !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error deleting your account" })
    }
}

const getMyFriends = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, 'Unauthorized !!')
        }

        const friendsFromCache = await getFriendsFromCache(userId);

        if(friendsFromCache){
            res.status(200).json(new ApiResponse(200, friendsFromCache, 'Here are your friends !!'))
            return ;
        }

        const dataFromDb =  await User.findById(userId)
                                .select('friends')
                                .populate('friends', 'name username profilePicture').lean();

        if(!dataFromDb){
            throw new ApiError(400, 'No data exists for this user !!')
        }
        const friendsFromDb = dataFromDb.friends.map(friend => ({...friend, isFriend: true}))
        
        await addFriendsToCache(friendsFromDb);

        res.status(200).json(new ApiResponse(200, friendsFromDb, 'Here are your friends !!'))

    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting your friends" })
    }
}

const logout = async(req, res) => {
    try {
        const options = {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        }
        res
        .status(200)
        .clearCookie('accessToken', options)
        .cookie('refreshToken', options)
        .json(new ApiResponse(200, 'OK', "Successfully logged out !!"))
    } catch (error) {
         res.status(error.statusCode || 500).json({message: error.message || "There was some error logging you out !!" })
    }
}

const getRequestsIRecieved = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, 'UnAuthenticated !!')
        }

        const userWithRequests = await User.findById(userId).select('requests').populate('requests.userId', 'username name profilePicture').lean()

        if (!userWithRequests || !userWithRequests.requests){
            res.status(200).json(new ApiResponse(200, [], "You don't have any recieved requests !!"))
            return ;
        }

        const filteredRequests = userWithRequests.requests.filter(request => request.sentOrRecieved === 'recieved').map(request => request.userId)

        res.status(200).json(new ApiResponse(200, filteredRequests, "Here are the requests that you have recieved !!"))
    } catch (error) {
         res.status(error.statusCode || 500).json({message: error.message || "There was some error logging you out !!" })
    }
}


// ---- utility function ----

const checkIsMyFriend = async(userId, friendId) => {
    try {
        const friendsFromCache = await getFriendsFromCache(userId);
        if(friendsFromCache){
            const friendIds = friendsFromCache.map(friend => friend._id)
            if(friendIds.includes(friendId)){
                return true;
            }else{
                return false;
            }
        }
        const friendsFromDb =  await User.findById(userId).select('friends') // herer we are not populating it as we are using it only for checking if friend or not ?

        if(friendsFromDb.friends.includes(friendId)){
            return true;
        }
        return false;
    } catch (error) {
        throw new ApiError(500, 'There was some problem while founding your friendship !!')
    }
}

const checkIsRequested = async(userId, friendId) => {
    try {
        const requestedList =  await User.findById(userId).select('requests') // herer we are not populating it as we are using it only for checking if friend or not ?
        const requestedDoc = requestedList.requests.find(request => request.userId.toString() === friendId)
        if(!requestedDoc){
            return {isRequested: false, sentOrRecieved: null}
        }
        return {isRequested: true, sentOrRecieved: requestedDoc.sentOrRecieved};
    } catch (error) {
        throw new ApiError(500, `There was some problem while founding your request details !!, ${error}`)
    }
}

export {
    verifyToken,
    resendVerificationLink,
    register, 
    login,
    authCheck,
    sendFriendRequest,
    responseToFriendRequest,
    searchByUsername,
    getUserProfile,
    editProfile,
    deleteAccountHandler,
    getMyFriends,
    logout,
    getRequestsIRecieved,
    checkIsMyFriend
}