import { redis } from "../db/redis";

USER_PREFIX = 'user:'

const user_tasks_to_cache = async (user_id, data, cursor, limit = 20, ttl = 3600) => {
    try {
        const key = `${USER_PREFIX}${user_id}:tasks:cursor:${cursor || 'start'}:limit:${limit}`;
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl);
        return response;
    } catch (error) {
        console.error("Redis Cache Save Error:", error.message);
        return null;
    }
};


const invalidate_users_tasks_cache_for_update = async (user_id, cursor = 'start', limit = 20) => {
    try {
        const key = `${USER_PREFIX}${user_id}:tasks:cursor:${cursor || 'start'}:limit:${limit}`;
        const response = await redis.del(key);
        return response; // (0 or 1)
    } catch (error) {
        console.log('Cache Invalidate Error (Single):', error.message);
        return null;
    }
};


const invalidate_users_tasks_cache_complete = async (user_id) => {
    try {
        const keys = await redis.keys(`${USER_PREFIX}${user_id}:tasks:cursor:*`);
        if (keys.length > 0) {
            await redis.del(...keys); // Delete all keys for this user
        }
        return "OK";
    } catch (error) {
        console.log('Cache Invalidate Error (Complete):', error.message);
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


export {
    user_tasks_to_cache,
    invalidate_users_tasks_cache_for_update,
    invalidate_users_tasks_cache_complete,
    user_tasks_from_cache,
}