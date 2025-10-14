import { redis } from "../db/redis.js";

const userPlateFromCache = async(username) => { // here i am referencing userPlate for the card info that we got on the search card !!
    try {
        const key = `user:userPlate:${username}`
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null ;
    } catch (error) {
        console.log(error)
        return null;
    }
}


const userPlateToCache = async(username, data, ttl=300) => { // for 5 minutes 
    try {
        const key = `user:userPlate:${username}`
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return response; // 'OK'
    } catch (error) {
        console.log(error)
        return null;
    }
}

const profileFromCache = async(userId) => {
    try {
        const key = `user:profile:${userId}`
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null ;
    } catch (error) {
        console.log(error)
        return null;
    }
}

const profileToCache = async(userId, data, ttl=300) => { // for 5 minutes 
    try {
        const key = `user:profile:${userId}`
        const response = await redis.set(key, JSON.stringify(data), 'EX', ttl)
        return response; // 'OK'
    } catch (error) {
        console.log(error)
        return null;
    }
}

const addFriendsToCache = async(userId, data) => {  // with these we can add a single friend or array of friends to cache !!
    try {
        const key = `user:${userId}:friends`
        const response = await redis.sadd(key,  ...(Array.isArray(data) ? data : [data]))
        return response;
    } catch (error) {
        console.error(error)
        return null;
    }
}

const getFriendsFromCache = async(userId) => {
    try {
        const key = `user:${userId}:friends`
        const data = await redis.smembers(key)
        return data ;
    } catch (error) {
        console.error(error)
        return [];
    }
}

const checkIfMyFriend = async (userId, friendId) => {
    try {
        const key = `user:${userId}:friends`;
        const exists = await redis.sismember(key, friendId);
        return exists === 1; // returns true or false
    } catch (error) {
        console.error(error);
        return false;
    }
};

const removeFriendFromCache = async (userId, friendId) => {
    try {
      const key = `user:${userId}:friends`;
      const result = await redis.srem(key, friendId);
      return result === 1; // true if removed, false if not found
    } catch (error) {
      console.error(error);
      return false;
    }
};

export {
    userPlateFromCache,
    userPlateToCache,
    profileFromCache,
    profileToCache,
    addFriendsToCache,
    getFriendsFromCache,
    checkIfMyFriend,
    removeFriendFromCache
}