import { leaderBoardFromCache, leaderBoardToCache, performanceFromCache, performanceToCache } from "../cache/stats.cache.js";
import { Stats } from "../models/stats.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// FORMULA FOR OVERALL SCORE (for now !!) --> 'completedTasks' * 'totalTasks' * 'streak + 1' (the same one stored in db)

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

const getLeaderBoard = async(req, res) => {
    // we will only implement this for public users
    // on the data for leaderboard profiles we will send the username, profilepic, overallScore
    // we will pick the top 20 only
    try {
        const dataFromCache = await leaderBoardFromCache();
        if (dataFromCache){
            res.status(200).json(new ApiResponse(200, dataFromCache, "Successfully got LeaderBoard !!"))
            return ;
        }

        const dataFromDb = await Stats.find({profileType: 'public'}).sort({overallScore: -1}).limit(20).select('userId overallScore').populate("userId", "username profilePicture").lean()

        if (dataFromDb.length != 0){
            await leaderBoardToCache(dataFromDb)
        }

        res.status(200).json(new ApiResponse(200, dataFromDb, "Successfully got LeaderBoard !!"))
    } catch (error) {
        res.status(error.status || 500).json({message: error.message || 'There was some error getting LeaderBoard' })
    }
}

export {
    getMyPerformance,
    getLeaderBoard,
}