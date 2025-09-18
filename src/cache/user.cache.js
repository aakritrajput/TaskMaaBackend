import { redis } from "../db/redis";

USER_PREFIX = 'user:'

const user_tasks_to_cache = async(user_id, tasks, page=1, limit=20, ttl=3600) => { // caching for 1 hour --> because on every creation and update we are invlalidating the data !!
    try {
        const key = `${USER_PREFIX}${user_id}:tasks:${page}:${limit}`
        const response = await redis.set(key, JSON.stringify(tasks), 'EX', ttl)
        return response;
    } catch (error) {
        console.log(error.message)
        return null;
    }
}

const invalidate_users_tasks_cache_for_update = async(user_id, page=1, limit=20) => { // whenever a task is updated then we can invalidate that particular page that have that task and ask backend for latest one !!
    try {
        const key = `${USER_PREFIX}${user_id}:tasks:${page}:${limit}`
        const response = await redis.del(key)
        return response ;
    } catch (error) {
        console.log(error.message)
        return null;
    }
}

const invalidate_users_tasks_cache_complete = async(user_id) => {  // now this is for invalidating the cache if a new task is added or any task deleted --> as if we just update a particular page's entries then the structure could exclude some of the tasks (in case of task creation ) and may have same task in 2 differnt entries (in case of deletion)
    try {
        const keys = await redisClient.keys(`${USER_PREFIX}${user_id}:tasks:*`);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
        return "OK"
    } catch (error) {
        console.log(error.message)
        return null;
    }
}

const user_tasks_from_cache = async(user_id, page=1, limit=20) => {
    try {
        const key = `${USER_PREFIX}${user_id}:tasks:${page}:${limit}`
        const tasks = await redis.get(key)
        return tasks ? JSON.parse(tasks) : null ;
    } catch (error) {
        console.log(error.message)
        return null;
    }
}

export {
    user_tasks_to_cache,
    invalidate_users_tasks_cache_for_update,
    invalidate_users_tasks_cache_complete,
    user_tasks_from_cache,
}