import { performanceFromCache, performanceToCache } from "../cache/stats.cache.js";
import { Stats } from "../models/stats.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getMyPerformance = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(400, "Unauthorised request !!")
        }

        const dataFromCache = await performanceFromCache(userId);
        if(dataFromCache){
            res.status(200).json(new ApiResponse(200, dataFromCache, "Here is your performance !!"))
            return ;
        }

        const dataFromDb = await Stats.findOne({userId}).lean()

        dataFromDb.streak = dataFromDb.streak - 1 ; // as in db we are storing actual streak + 1 // for overall score point of view

        await performanceToCache(userId, dataFromDb)

        res.status(200).json(new ApiResponse(200, dataFromDb, "Here is your performance !!"))
    } catch (error) {
        res.status(error.status || 500).json({message: error.message || 'There was some error getting your performance' })
    }
}

export {
    getMyPerformance,
    
}