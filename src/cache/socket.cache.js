import { redis } from "../db/redis";

const socketIdForUser = async(userId, socketId) => {
    try {
        const key = `user:${userId}:socket`
        const response = await redis.set(key, JSON.stringify(socketId))
        return response;
    } catch (error) {
        console.error('Error setting socket id for given user in cache: ',error)
        return null;
    }
}


const invalidateSocketIdForUser = async(userId) => {
    try {
        const key = `user:${userId}:socket`
        const response = await redis.del(key)
        return response;
    } catch (error) {
        console.error('Error invalidating user socket id from cache: ', error)
        return null;
    }
}