import { redis } from "../db/redis";

USER_PREFIX = 'user:'

const groupTasks_from_cache = async(userId) => {
    try {
        const key = `${USER_PREFIX}${userId}:groupTasks`;
        const tasks = await redis.get(key);
        return tasks ? JSON.parse(tasks) : null;
    } catch (error) {
        console.error("Redis Cache Save Error:", error.message);
        return null;
    }
}

const groupTasks_to_cache = async(userId, data, ttl=7200) => {
    try {
        const key = `${USER_PREFIX}${userId}:groupTasks`;
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return response ;
    } catch (error) {
        console.error(error)
        return null;
    }
}

const invalidate_groupTask_cache = async(userId) => {
    try {
        const key = `${USER_PREFIX}${userId}:groupTasks`;
        const response = await redis.del(key)
        return response ;
    } catch (error) {
        return null;
    }
}

export {
    groupTasks_from_cache,
    groupTasks_to_cache,
    invalidate_groupTask_cache,
}