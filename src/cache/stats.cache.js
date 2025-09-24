import { redis } from "../db/redis";

const performanceFromCache = async(userId) => {
    try {
        key = `user:${userId}:performance`
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error("Redis Cache Save Error:", error.message);
        return null;
    }
}