// add task
// get whole task details -- single task
// get users task -- with basic info..
// get group tasks
// get task by its status -- saw what statuses 
// create a group task
// create a chat from that group task
// add other members to group task
// request to be the part of that public gorup task

import { task_from_cache, task_to_cache } from "../cache/task.cache.js";
import { update_user_tasks_cache, user_tasks_from_cache, user_tasks_to_cache } from "../cache/user.cache.js";
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
        
        await task_to_cache(returnedTask, 1800) // the result will be "OK" if saved else null but lets not check that as we are like -- let it be independent as we will be optionally checking if there in cache pick it from there and if not then use the database -- so no worries !!
        await update_user_tasks_cache(user._id, returnedTask) // for storing this newly created task in users dashboard cache !!

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

const getMyGeneralTasks = async(req, res) => {  // here we need to do an update that we are only suppose to add some information to the data sending as this is not for detailed discription of tasks
    try {
        const userId = req.user._id
        const {page, offset=20} = req.query
        
        if(userId){
            throw new ApiError(401, "UnAuthorized Request !! Please login first to access your tasks..")
        }

        const tasksFromCache = await user_tasks_from_cache(userId)

        if(tasksFromCache){
            res.status(200).json(new ApiResponse(200, tasksFromCache, "Here are your tasks !!"))
            return ;
        }

        const tasksFromDb = await Task.find({
            user: userId,
            type: 'general', // we are here only dealing with general tasks as i have planned that we will not show previous days tasks as they can be seperately called if user wanted to get those..
        })

        if(tasksFromDb.length !== 0){
            await user_tasks_to_cache(userId, tasksFromDb)
        }

        res.status(200).json(new ApiResponse(200, tasksFromDb, "Here are your tasks !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error getting your tasks !!'})
    }
}

const getMyGroupTasks = async(req, res) => {
    try {
        const userId = req.user._id;

    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error getting your tasks !!'})
    }
}