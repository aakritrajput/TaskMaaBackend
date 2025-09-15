import { redis } from "../db/redis";

USER_PREFIX = 'user:'

const user_tasks_to_cache = async(user_id, tasks, ttl=3600) => { // caching for 1 hour
    try {
        const key = `${USER_PREFIX}${user_id}:tasks`
        const response = await redis.set(key, JSON.stringify(tasks), 'EX', ttl)
        return response;
    } catch (error) {
        console.log(error.message)
        return null;
    }
}

const update_user_tasks_cache = async(user_id, task, ttl=3600) => { // we will use this when we create a new task then to append that task to our existing cache in redis -- and if cache does not exist then thats also ohk -- then we have to check db for tasks again !!
    try {
        const key = `${USER_PREFIX}${user_id}:tasks`
        const oldTasksCache = await redis.get(key)
        if(!oldTasksCache){
            return null; // this is for -- if there is no previous task cache so we dont need to update that simple :)
        }
        const newTasksCache = [task, ...JSON.parse(oldTasksCache)]
        const response = await redis.set(key, JSON.stringify(newTasksCache), 'EX', ttl)
        return response;
    } catch (error) {
        console.log(error.message)
        return null;
    }
}

const user_tasks_from_cache = async(user_id) => {
    try {
        const key = `${USER_PREFIX}${user_id}:tasks`
        const tasks = await redis.get(key)
        return tasks ? JSON.parse(tasks) : null ;
    } catch (error) {
        console.log(error.message)
        return null;
    }
}

export {
    user_tasks_to_cache,
    update_user_tasks_cache,
    user_tasks_from_cache
}