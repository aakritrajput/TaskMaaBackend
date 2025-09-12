import jwt from "jsonwebtoken"
import { ApiError } from "../utils/ApiError"
import { User } from "../models/user.model"

const authCheck = async(req, res, next) => {
    try {
        const accessToken = req.cookies?.accessToken
        if(!accessToken){
            throw new ApiError(401, "No access token included in the request... Please login again to get one !!")
        }

        const decodedAccessToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET) // if the access token will be expired it will throw an error named: 'TokenExpiredError' or if not valid token then 'JsonWebTokenError'
        req.user = decodedAccessToken
        next()
    } catch (error) {
        try {
            if(error.name == 'TokenExpiredError'){
                const refreshToken = req.cookies?.refreshToken
                if(!refreshToken){
                    throw new ApiError(401, "No refresh token, Please login... ")
                }
                const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
                const user = await User.findById(decodedRefreshToken._id).select('-hashedPassword')
                if(!user){
                    throw new ApiError(404, 'No user found with given refresh token!!')
                }
                const newAccessToken = user.generateAccessToken()
                if(!newAccessToken){
                    throw new ApiError(500, "There was a problem generating new accessToken")
                }

                const newRefreshToken = user.generateRefreshToken()
                if(!newRefreshToken){
                    throw new ApiError(500, "There was a problem generating new refreshToken")
                }

                const options = {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'None',
                }

                res
                .cookies('accessToken', newAccessToken, options)
                .cookies('refreshToken', newRefreshToken, options)

                req.user = {_id: user._id, email: user.email, username: user.username} // here attached only few things so that the req. should match with the req. updated using access token as that also include only these three things !!
                next();
            }else{
                res.status(error.statusCode || 401).json({message: error.message || "Invalid Access token.. Please login !!"})
            }
        } catch (err) {
            res.status(err.statusCode || 201).json({message: err.message || "Unauthorized request... Please login !!"})
        }
    }
}