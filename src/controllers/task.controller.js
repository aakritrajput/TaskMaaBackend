// add task
// get whole task details -- single task
// get users task -- with basic info..
// get group tasks
// get task by its status -- saw what statuses 
// create a group task
// create a chat from that group task
// add other members to group task
// request to be the part of that public gorup task

import { delete_task_in_cache, task_from_cache, task_to_cache } from "../cache/task.cache.js";
import { cache_todays_tasks, user_tasks_from_cache, user_tasks_to_cache, users_todays_tasks_cache } from "../cache/user.cache.js";
import { Task } from "../models/task.model";
import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const addTask = async(req, res) => {
    try {
        const {title} = req.body  // only hardcoding the required field which will not be having any default value 
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
        for (const field of ['description', 'importance', 'status', 'type', 'dueDate']){   // here we are checking for not required fields as we will be having some sought of default values for them in our model !!
            const value = req.body[field];  
            if (!value) continue ; // it will skip all falsy values !!
            taskData[field] = value;
        }

        const returnedTask = await Task.create(taskData)
        
        await task_to_cache(returnedTask, 1800) // the result will be "OK" if saved else null but lets not check that as we are like -- let it be independent as we will be optionally checking if there in cache pick it from there and if not then use the database -- so no worries !!
        res.status(201).json(new ApiResponse(201, returnedTask, "Successfully Created the Task !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error adding your task !!'})
    }
}

const getTask = async(req, res) => {
    try {
        const {taskId} = req.params
        if(!taskId){
            throw new ApiError(400, 'Please provide TaskId !!')
        }

        const taskFromCache = await task_from_cache(taskId)

        if(taskFromCache){  // if existed in cache return that else from database !!
            res.status(200).json(new ApiResponse(200, taskFromCache, "Here is your task !!"));
            return;
        }
        
        const taskFromDb = await Task.findById(taskId)

        if(!taskFromDb){
            throw new ApiError(404, "No task found with the given id !!")
        }

        await task_to_cache(taskFromDb, 1800)

        res.status(200).json(new ApiResponse(200, taskFromDb, "Here is your task !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error getting your task !!'})
    }
}

const getAllTasks = async (req, res) => {
    try {
        const userId = req.user._id;
        const { limit = 20, cursor } = req.query; 
        const limitNumber = parseInt(limit, 10);  

        if (!userId) {
            throw new ApiError(401, "Unauthorized Request! Please login first to access your tasks.");
        } 

        const cachedData = await user_tasks_from_cache(userId, cursor, limit)
        if (cachedData) {
            res.status(200).json(new ApiResponse(200, JSON.parse(cachedData), "Here are your tasks (from cache)"));
        }

        let query = { user: userId };
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) }; // fetching tasks created before given cursor timestamp
        } 
        
        const tasks = await Task.find(query)
          .sort({ createdAt: -1 }) // latest first
          .limit(limitNumber + 1)   // +1 to check if there is more data ?
          .lean();                  // lean() gives plain JS objects, faster  
        
        let nextCursor = null;
        if (tasks.length > limitNumber) {
            nextCursor = tasks[tasks.length - 1].createdAt.toISOString(); 
            tasks.pop(); // remove the extra one
        } 

        // final response
        const responseData = {
          tasks,
          pagination: {
            limit: limitNumber,
            nextCursor,
            hasMore: !!nextCursor //strict not operator --> can force any value to boolean
          }
        };    

        await user_tasks_to_cache(userId, responseData, nextCursor, limitNumber)

        res.status(200).json(new ApiResponse(200, responseData, "Here are your tasks!"));  
    } catch (error) {
        console.error("Error in getAllTasks:", error.message);
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error getting your tasks!'});
    }
};

const deleteTask = async(req, res) => {
    try {
        const userId = req.user._id
        if (!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }
        const taskId = req.params
        if (!taskId){
            throw new ApiError(400, 'Task Id not provided -- which is required !!')
        }

        await Task.findByIdAndDelete(taskId)
        await delete_task_in_cache(taskId) // for deleting complete information of the task in cache
        await invalidate_users_tasks_cache_complete(userId) // for deleting the part stored along with other tasks
        res.status(200).json(new ApiResponse(200, {}, 'Task Successfully deleted !!'))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error Deleting your task !!'});
    }
}

const getTodaysTasks = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }

        const cachedData = await users_todays_tasks_cache(userId);
        if (cachedData) {
            res.status(200).json(new ApiResponse(200, cachedData, "Here are your today's tasks"))
            return ;
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Today at 00:00:00
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // Today at 23:59:59.999
        
        const tasks_from_db = await Task.find({
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        });

        if(tasks_from_db.length > 0){
            await cache_todays_tasks(userId, tasks_from_db)
        }
        
        res.status(200).json(new ApiResponse(200, tasks_from_db, "Here are your today's tasks"))
        
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting today's tasks !!"});
    }
}