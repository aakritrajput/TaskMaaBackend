// add task
// get whole task details -- single task
// get users task -- with basic info..
// get group tasks
// get task by its status -- saw what statuses 
// create a group task
// create a chat from that group task
// add other members to group task
// request to be the part of that public gorup task

import { Task } from "../models/task.model";
import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const addTask = async(req, res) => {
    try {
        const {title, description, importance, status, type, dueDate} = req.body
        if (title.trim().length == 0){
            throw new ApiError(400, "Please Provide a valid title !!")
        }
        const user = req.user
        if(!user){
            throw new ApiError(401, "Unauthorized request !!")  // this is already checked in auth middleware but just for safety or can say double check !!
        }

        const taskData = {
            user: user._id,
            title
        }
        for (const field of ['description', 'importance', 'status', 'type', 'dueDate']){ 
            const value = req.body[field];  
            if (!value) continue ; // it will skip all falsy values !!
            taskData[field] = value;
        }

        const returnedTask = await Task.create(taskData)
        

    } catch (error) {
        
    }
}