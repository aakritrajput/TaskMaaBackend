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

const getSocketIdOfUser = async(userId) => { // we will need this when sending message for particular user !!
    try {
        const key = `user:${userId}:socket`
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting user socket id from cache: ', error)
        return null;
    }
}

const messageToCacheQueue = async(message) => {
    try {
        // pushing to queue
        await redis.lpush('message_queue', JSON.stringify(message));

        // Update last message cache
        await redis.hset(`last_message:${chatId}`, 'text', message.content, 'timestamp', message.timestamp)

        // Increment unread count
        await redis.hincrby(`unread_count:${receiverId}`, chatId, 1)

        return 'OK'
    } catch (error) {
        console.error('Error from messageToCacheQueue: ', error)
        return null;
    }
}

const updateUnreadCount = async(userId, chatId) => {
    try {
        await redis.hdel(`unread_count:${userId}`, chatId);
        return "OK"
    } catch (error) {
        console.error('Error while updating unread count in cache:', error)
        return null;
    }
}

const storeOfflineMessage = async(message) => {
    try {
        const key = `offlineMessages:${message.receiverId}`
        await redis.rpush(key, JSON.stringify(message)); // rpush becuase we want our messages to stay in the same order as they were sent !!
        return 'OK';
    } catch (error) {
        console.error('Error while storing offline messages in cache:', error)
        return null;
    }
}

const getUsersOfflineMessages = async(userId) => {
    try {
        const key = `offlineMessages:${userId}`
        const messages = await redis.lrange(key, 0, -1); // it will give the complete list of unread messages of the user
        await redis.del(key)
        return messages.map(msg => JSON.parse(msg)); // we are here parsing each single message because when we stored them - we stored them by parsing them to json 
    } catch (error) {
        console.error('Error while getting offline messages of user from cache:', error)
        return []; // we don't want that if got any error in cache then it stops the main function hence returning empty list from error !!
    }
}

export {
    socketIdForUser,
    invalidateSocketIdForUser,
    getSocketIdOfUser,
    messageToCacheQueue,
    updateUnreadCount,
    storeOfflineMessage,
    getUsersOfflineMessages
}