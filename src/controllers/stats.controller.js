import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getMyPerformance = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(400, "Unauthorised request !!")
        }
        
    } catch (error) {
        res.status(error.status || 500).json({message: error.message || 'There was some error getting your performance' })
    }
}