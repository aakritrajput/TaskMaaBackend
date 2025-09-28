import { redis } from "../db/redis";

const socketIdForUser = async(userId, socketId) => {
    try {
        const key = `user:${userId}:socket`
        const response = await redis.set(key, JSON.stringify(socketId))
        return response;
    } catch (error) {
        console.log(error)
        return null;
    }
}
