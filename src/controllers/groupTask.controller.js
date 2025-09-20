import { invalidate_groupTask } from "../cache/groupTask.cache.js";
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

        await invalidate_groupTask(userId);
        res.status(201).json(new ApiResponse(201, returnedTask, "Successfully Created the GroupTask !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error adding your task !!'})
    }
}