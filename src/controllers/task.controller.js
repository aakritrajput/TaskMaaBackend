import { invalidatePerformanceCache } from "../cache/stats.cache.js";
import { cache_general_tasks, cache_todays_tasks, invalidate_general_tasks, invalidate_todays_tasks, user_tasks_from_cache, user_tasks_to_cache, users_general_tasks_cache, users_todays_tasks_cache } from "../cache/task.cache.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { updateOverAllScore } from "../workers/overAllScoreWorker.js";

const addTask = async(req, res) => {
    try {
        const {title, dueDate} = req.body  // only hardcoding the required field which will not be having any default value 
        if (title.trim().length == 0){
            throw new ApiError(400, "Please Provide a valid title !!")
        }
        if (!dueDate) {
            throw new ApiError(400, "Please provide valid due date !!")
        }
        const user = req.user
        if(!user){
            throw new ApiError(401, "Unauthorized request !!")  // this is already checked in auth middleware but just for safety or can say double check !!
        }

        const taskData = {
            user: user._id,
            title,
            dueDate: new Date(dueDate)
        }
        for (const field of ['description', 'importance', 'status', 'type', 'dueDate']){   // here we are checking for not required fields as we will be having some sought of default values for them in our model !!
            const value = req.body[field];  
            if (!value) continue ; // it will skip all falsy values !!
            taskData[field] = value;
        }

        const returnedTask = await Task.create(taskData)

        if(returnedTask.type == 'daily'){
            await invalidate_todays_tasks(user._id)
        }else{
            await invalidate_general_tasks(user._id)
        }
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
        const {taskId} = req.params
        if (!taskId){
            throw new ApiError(400, 'Task Id not provided -- which is required !!')
        }

        const deletedTask = await Task.findByIdAndDelete(taskId)
        console.log('deletedTask: ', deletedTask)
        if(deletedTask.status == 'completed'){
            updateOverAllScore(userId, 'deletedCompleted')
            await invalidatePerformanceCache(userId);
        }

        if(deletedTask?.type == 'daily'){ // here we can apply deep check that if the daily task is today's task and if yes then only invalidate today's task cache else not similarly for general tasks also ---> if this deleted task also belongs to our cached tasks range !!
            await invalidate_todays_tasks(userId)
        }else{
            await invalidate_general_tasks(userId)
        }
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
          user: userId,
          type: 'daily',
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

const getGeneralTasks = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, 'Unauthorized request !!')
        }

        const cachedData = await users_general_tasks_cache(userId)
        if (cachedData) {
            res.status(200).json(new ApiResponse(200, cachedData, "Here are your general tasks"))
            return ;
        }

        const today = new Date();
        const tasks_from_db = await Task.find({ // it returns task who's (due date + 7 days) is greator then today
            user: userId,
            type: 'general',
            $expr: {
                $gt: [
                    { $add: ["$dueDate", 7 * 24 * 60 * 60 * 1000] }, // dueDate + 7 days
                    today
                ]
            }
        });

        if(tasks_from_db.length > 0){
            await cache_general_tasks(userId, tasks_from_db)
        }
        
        res.status(200).json(new ApiResponse(200, tasks_from_db, "Here are your general tasks"))
        
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || "There was some error getting your general tasks !!"});
    }
}

const editTask = async(req, res) => {
    try {
        const {taskId} = req.params
        if(!taskId){
            throw new ApiError(400, "Task id not provided !!")
        }
        const {title} = req.body  // in update all the data should be sent from frontend .. here we are only checking for title but in an update all the data should be passed (but still thier might not be some data in that fild that's why only checking title)
        if (title.trim().length == 0){
            throw new ApiError(400, "title missing !!")
        }
        const user = req.user
        if(!user){
            throw new ApiError(401, "Unauthorized request !!")
        }

        const taskData = {
            user: user._id,
            title
        }
        for (const field of ['description', 'importance', 'completedOn' ,'status','weeklyProgress', 'type', 'dueDate']){
            const value = req.body[field];
            if (!value && field !== 'completedOn') continue ; // it will skip all falsy values !!
            taskData[field] = value;
            if(field == 'status' && value){  // if the value of status is not provided to edit then not firing the overallWorker 
                if(value == 'completed'){
                    updateOverAllScore(user._id, 'markedComplete')
                }
                else if(value == 'inProgress'){
                    updateOverAllScore(user._id, 'markedUncomplete')
                }
            }
        }

        const returnedTask = await Task.findByIdAndUpdate(taskId, taskData)

        if(returnedTask.type == 'daily'){
            await invalidate_todays_tasks(user._id)
        }else{
            await invalidate_general_tasks(user._id)
        }
        await invalidatePerformanceCache(user._id);
        console.log('edited done !!')
        res.status(200).json(new ApiResponse(200, returnedTask, "Successfully Edited the Task !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error editing your task !!'})
    }
}

const toggleStatus = async(req, res) => { // instead of this we can also use the above update one but we will specifically also need this toggle option !!
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized request !!")
        }
        const {taskId} = req.params
        if(!taskId){
            throw new ApiError(400, "Task id not provided !!")
        }
        
        const {status} = req.body
        const allowedStatus = ["pending", "in-progress", "completed"];
        if (!allowedStatus.includes(status)){
            throw new ApiError(400, "Please provide valid status option !!")
        }

        const updatedTask = await Task.findByIdAndUpdate(taskId, {
            status: status
        },{ new: true })

        if(updatedTask.type == 'daily'){
            await invalidate_todays_tasks(userId)
        }else{
            await invalidate_general_tasks(userId)
        }
        res.status(201).json(new ApiResponse(201, updatedTask, "Successfully Toggled the status of your task !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'There was some error toggling your task !!'})
    }
}

export {
    addTask,
    getTask,
    getAllTasks,
    deleteTask,
    getTodaysTasks,
    getGeneralTasks,
    editTask,
    toggleStatus
}