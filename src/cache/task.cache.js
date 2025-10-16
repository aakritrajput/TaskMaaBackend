import { redis } from "../db/redis.js";

const USER_PREFIX = 'user:'

const user_tasks_to_cache = async (user_id, data, cursor, limit = 20, ttl = 120) => { // here we are only caching for 2 minutes as these tasks would not be on main page and hence they will automatically be invalidate after 2 minutes
    try {
        const key = `${USER_PREFIX}${user_id}:tasks:cursor:${cursor || 'start'}:limit:${limit}`;
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl);
        return response;
    } catch (error) {
        console.error("Redis Cache Save Error:", error.message);
        return null;
    }
};

const user_tasks_from_cache = async (user_id, cursor, limit = 20) => {
    try {
        const key = `${USER_PREFIX}${user_id}:tasks:cursor:${cursor || 'start'}:limit:${limit}`;
        const cachedData = await redis.get(key);
        return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
        console.error("Redis Cache Fetch Error:", error.message);
        return null;
    }
};

// const invalidate_users_tasks_cache_for_update = async (user_id, cursor = 'start', limit = 20) => {
//     try {
//         const key = `${USER_PREFIX}${user_id}:tasks:cursor:${cursor || 'start'}:limit:${limit}`;
//         const response = await redis.del(key);
//         return response; // (0 or 1)
//     } catch (error) {
//         console.log('Cache Invalidate Error (Single):', error.message);
//         return null;
//     }
// };

// const invalidate_users_tasks_cache_complete = async (user_id) => {
//     try {
//         const keys = await redis.keys(`${USER_PREFIX}${user_id}:tasks:cursor:*`);
//         if (keys.length > 0) {
//             await redis.del(...keys); // Delete all keys for this user
//         }
//         return "OK";
//     } catch (error) {
//         console.log('Cache Invalidate Error (Complete):', error.message);
//         return null;
//     }
// };

const users_todays_tasks_cache = async(user_id) => {
    try {
        const today = new Date().toISOString().split('T')[0]; 
        const key = `${USER_PREFIX}${user_id}:${today}`;
        const tasks = await redis.get(key);
        return tasks ? JSON.parse(tasks) : null;
    } catch (error) {
        return null ;
    }
}

const cache_todays_tasks = async(user_id, data, ttl=3600) => { // for 1 hour
    try {
        const today = new Date().toISOString().split('T')[0]; 
        const key = `${USER_PREFIX}${user_id}:${today}`;
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return response ;
    } catch (error) {
        return null;
    }
}

const invalidate_todays_tasks = async(user_id) => {
    try {
        const today = new Date().toISOString().split('T')[0]; 
        const key = `${USER_PREFIX}${user_id}:${today}`;
        const response = await redis.del(key)
        return response ;
    } catch (error) {
        return null;
    }
}

const users_general_tasks_cache = async(user_id) => {
    try {
        const key = `${USER_PREFIX}${user_id}:general`;
        const tasks = await redis.get(key);
        return tasks ? JSON.parse(tasks) : null;
    } catch (error) {
        return null ;
    }
}

const cache_general_tasks = async(user_id, data, ttl=7200) => { // for 2 hour --. rarely changes !! :) --> but its ohk like we will be invalidating on updates
    try {
        const key = `${USER_PREFIX}${user_id}:general`;
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return response ;
    } catch (error) {
        return null;
    }
}

const invalidate_general_tasks = async(user_id) => {
    try {
        const key = `${USER_PREFIX}${user_id}:general`;
        const response = await redis.del(key)
        return response ;
    } catch (error) {
        return null;
    }
}

export {
    user_tasks_to_cache,
    user_tasks_from_cache,
//    invalidate_users_tasks_cache_for_update,
//    invalidate_users_tasks_cache_complete,
    users_todays_tasks_cache,
    cache_todays_tasks,
    invalidate_todays_tasks,
    users_general_tasks_cache,
    cache_general_tasks,
    invalidate_general_tasks
}