import { redis } from '../db/redis.js'
import { ApiError } from '../utils/ApiError.js';

TASK_PREFIX = "task:";

// const task_to_cache = async(task, ttl=300) => { // default ttl = 5 minutes   --->  this can be again use to update the cache as the new entry will overright the existing one !!
//     try {
//         const key = `${TASK_PREFIX}${task._id}`;
//         const result = await redis.set(key, JSON.stringify(task), 'EX', ttl);
//         return result; // "OK"
//     } catch (error) {
//         console.log(error.message)
//         return null; // we will not throw error as we dont want that just because our cache is not saved we should throw error 
//     }
// }

// const task_from_cache = async(task_id) => {
//     try {
//         const key = `${TASK_PREFIX}${task_id}`;
//         const task = await redis.get(key)
//         return task ? JSON.parse(task) : null ;
//     } catch (error) {
//         console.log(error.message)
//         return null;
//     }
// }

// const delete_task_in_cache = async(task_id) => {
//     try {
//         const key = `${TASK_PREFIX}${task_id}`;
//         const result = await redis.del(key)
//         return result; // 1 -> key existed and deleted OR 0 -> key did not exist --> so in and all this will definately delete the cache with the given id and if id does not exist (thats also not a problem !!) it will just give 0
//     } catch (error) {
//         console.log(error.message)
//         return null;
//     }
// }

// export {
//     task_to_cache,
//     task_from_cache,
//     delete_task_in_cache
// }

// ------------- I don't think that we will need this single tasks as we will just be showing the collected tasks not the single task !!