import { groupTasks_from_cache, groupTasks_to_cache, invalidate_groupTask_cache } from "../cache/groupTask.cache.js";
import { GroupTask } from "../models/groupTaskModels/groupTask.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const creatGroupTask = async(req, res) => {
     try {
        const {title, dueDate} = req.body
        if (title.trim().length == 0){
            throw new ApiError(400, "Please Provide a valid title !!")
        }
        if (!dueDate) {
            throw new ApiError(400, "Please provide valid due date !!")
        }

        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized request !!") 
        }

        const taskData = {
            creatorId: userId,
            title,
            dueDate, // keep in mind that this should be in proper Date type !!
        }

        for (const field of ['description', 'importance', 'status', 'type', 'dueDate']){   // here we are not adding check for winners as when we are creating then we would not be having winners on just task creation !!
            const value = req.body[field];  
            if (!value) continue ; // it will skip all falsy values !!
            taskData[field] = value;
        }

        const returnedTask = await GroupTask.create(taskData)

        await invalidate_groupTask_cache(userId);
        res.status(201).json(new ApiResponse(201, returnedTask, "Successfully Created the GroupTask !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error adding your task !!'})
    }
}

const getMyGroupTask = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }

        const cachedData = await groupTasks_from_cache(userId)
        if (cachedData) {
            res.status(200).json(new ApiResponse(200, cachedData, "Here are your group tasks"))
            return ;
        }

        const today = new Date();
        const tasks_from_db = await GroupTask.find({ // it returns task who's (due date + 7 days) is greator then today
            $expr: {
                $gt: [
                    { $add: ["$dueDate", 7 * 24 * 60 * 60 * 1000] }, // dueDate + 7 days
                    today
                ]
            }
        });

        if(tasks_from_db.length > 0){
            await groupTasks_to_cache(userId, tasks_from_db)
        }
        
        res.status(200).json(new ApiResponse(200, tasks_from_db, "Here are your group tasks"))
        
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting your group tasks !!"});
    }
}

const deleteGroupTask = async(req, res) => {
    try {
        const userId = req.user._id
        if (!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }
        const groupTaskId = req.params
        if (!groupTaskId){
            throw new ApiError(400, 'Group task Id not provided -- which is required !!')
        }

        const deletedGroupTask = await GroupTask.findByIdAndDelete(groupTaskId)

        await invalidate_groupTask_cache(groupTaskId)
        res.status(200).json(new ApiResponse(200, {}, 'GroupTask Successfully deleted !!'))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error Deleting your group task !!'});
    }
}

export {
    creatGroupTask,
    getMyGroupTask,
    deleteGroupTask,
    
}