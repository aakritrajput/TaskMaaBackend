import { redis } from "../db/redis.js";

const USER_PREFIX = 'user:'

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

const publicGroupTasks_from_cache = async() => {
    try {
        const key = `${USER_PREFIX}:publicGroupTasks`;
        const groupTasks = await redis.get(key)
        return groupTasks ? JSON.parse(groupTasks) : null;
    } catch (error) {
        console.error(error)
        return null;
    }
}

const publicGroupTasks_to_cache = async(data) => {
    try {
        const key = `${USER_PREFIX}:publicGroupTasks`;
        const response = await redis.set(key, JSON.stringify(data))
        return response ;
    } catch (error) {
        console.error(error)
        return null;
    }
}

const invalidate_publicGroupTask_cache = async() => {
    try {
         const key = `${USER_PREFIX}:publicGroupTasks`;
        const response = await redis.del(key)
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
        console.error(error)
        return null;
    }
}

const groupTaskMembersToCache = async(taskId, data, ttl = 300) => {
    try {
        const key = `groupTask:members:${taskId}`;
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return response ;
    } catch (error) {
        console.error(error)
        return null;
    }
}

const groupTaskMembersFromCache = async(taskId) => {
    try {
        const key = `groupTask:members:${taskId}`;
        const groupTaskMembers = await redis.get(key)
        return groupTaskMembers ? JSON.parse(groupTaskMembers) : null;
    } catch (error) {
        console.error(error)
        return null;
    }
}

const invalidateGroupTaskMembers = async(taskId) => {
    try {
        const key = `groupTask:members:${taskId}`;
        const response = await redis.del(key)
        return response ;
    } catch (error) {
        console.error(error)
        return null;
    }
}

export {
    groupTasks_from_cache,
    groupTasks_to_cache,
    invalidate_groupTask_cache,
    publicGroupTasks_from_cache,
    publicGroupTasks_to_cache,
    invalidate_publicGroupTask_cache,
    groupTaskMembersToCache,
    groupTaskMembersFromCache,
    invalidateGroupTaskMembers,
}