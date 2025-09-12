import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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


export {
    register, 
    login,

}