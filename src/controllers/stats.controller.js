import { invalidatePerformanceCache, leaderBoardFromCache, leaderBoardToCache, performanceFromCache, performanceToCache } from "../cache/stats.cache.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { updateOverAllScore } from "../workers/overAllScoreWorker.js";

// FORMULA FOR OVERALL SCORE (for now !!) --> 'completedTasks' * 'totalTasks' * 'streak + 1' (the same one stored in db) + number of badges*5

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

        const dataFromDb = await User.findById(userId).select('currentStreak longestStreak overallScore weeklyProgress lastStreakOn badges').lean()
        
        const today = new Date();
        const last = new Date(dataFromDb.lastStreakOn);
        
        const gapMs = today - last; // difference in milliseconds
        const gapDays = Math.floor(gapMs / (1000 * 60 * 60 * 24));

        if(gapDays > 0){
            for (let i = 0; i < gapDays; i++) {
                dataFromDb.weeklyProgress.push(0);       // adding zero for missing day
                if (dataFromDb.weeklyProgress.length > 7) weeklyProgress.shift(); // will keep only last 7 entries
            }
        }
        
        await performanceToCache(userId, dataFromDb)

        res.status(200).json(new ApiResponse(200, dataFromDb, "Here is your performance !!"))
    } catch (error) {
        res.status(error.status || 500).json({message: error.message || 'There was some error getting your performance' })
    }
}

const updateStreak = async(req, res) => {
    try {
        const user = await User.findById(req.user._id).select('currentStreak longestStreak lastStreakOn badges')
        const {action} = req.params // 'add' or 'remove'
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()

        // just a check that if lastStreakUpdate is today then do nothing but this should be make sure in frontend to only call the api for first task completion
        if(user.lastStreakOn == today && action == 'remove'){
            user.currentStreak -= 1 // this is if 1 time we updated teh streak but if again the user marks the same 1st task as uncompleted --
            if(user.currentStreak = 0){
                user.lastStreakOn = new Date(Date.now() - (86400000 * 2)).toDateString() // it is a placeholder that if current Streak is zero which means he has missed one day !! therefore here we are taking assuming the last streak is 2 days before
            }
            else if(user.currentStreak > 0){
                user.lastStreakOn = yesterday;
            }
        }
        else if(user.lastStreakOn == today && action == 'add'){
            console.log('Already updated the streak !!') // do nothing
        }
        else if(user.lastStreakOn == yesterday){
            user.currentStreak += 1
            user.lastStreakOn = today;
        }else{
            console.log('streak current setting runs !!')
            user.currentStreak = 1
            user.lastStreakOn = today;
        }

        if(user.currentStreak > user.longestStreak){// this will be the case if we gonna reach a new longest streak then check if the new longest streak would be in our streak based badge assingments
            if([5, 10, 15, 20, 25, 30, 60, 180, 360].includes(user.currentStreak)){
                if(![180, 360].includes(user.currentStreak)){
                    updateOverAllScore(user._id, `streak${user.currentStreak}`)
                    user.badges.push(`streak${user.currentStreak}`)
                }
                else if(user.currentStreak == 180){
                    updateOverAllScore(user._id, 'streak6M')
                    user.badges.push('streak6M')
                }
                else if(user.currentStreak == 360){
                    updateOverAllScore(user._id, 'streak1Y')
                    user.badges.push('streak1Y')
                }
            }
        }
        user.longestStreak = Math.max(user.longestStreak, user.currentStreak)
        await user.save()
        await invalidatePerformanceCache(user._id);
        res.status(200).json(new ApiResponse(200, 'OK', 'Successfully updated your streak'))
    } catch (error) {
        res.status(error.status || 500).json({message: error.message || 'There was some error updating your streak' })
    }
}

const getLeaderBoard = async(req, res) => {
    try {
        const dataFromCache = await leaderBoardFromCache();
        if (dataFromCache){
            res.status(200).json(new ApiResponse(200, dataFromCache, "Successfully got LeaderBoard !!"))
            return ;
        }

        const dataFromDb = await User.find({profileType: 'public'}).select('overallScore username profilePicture').sort({overallScore: -1}).limit(20).lean()

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
    updateStreak
}