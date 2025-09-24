import { redis } from "../db/redis";

const performanceFromCache = async(userId) => {
    try {
        key = `user:${userId}:performance`
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error("Redis Cache get Error:", error.message);
        return null;
    }
}

const performanceToCache = async(userId, data, ttl=300) => { // cache for 5 minutes - as this is something which will update frequently so that's why for 5 minutes but if updated within that then we can invalidate manually !!
    try {
        key = `user:${userId}:performance`
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return response ;
    } catch (error) {
        console.error("Redis Cache Save Error:", error.message);
        return null;
    }
}

export {
    performanceFromCache,
    performanceToCache,
}