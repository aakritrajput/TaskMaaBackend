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

const invalidateProfileFromCache = async(userId) => {
    try {
        const key = `user:profile:${userId}`
        const response = await redis.del(key)
        return response;
    } catch (error) {
        console.log(error)
        return null;
    }
}

const addFriendsToCache = async(userId, data, ttl=600) => {  // with these we can add a single friend or array of friends to cache !!
    try {
        const key = `user:${userId}:friends`
        const response = await redis.set(key, JSON.stringify(data), 'EX',  ttl)
        return response;
    } catch (error) {
        console.error(error)
        return null;
    }
}

const getFriendsFromCache = async(userId) => {
    try {
        const key = `user:${userId}:friends`
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(error)
        return [];
    }
}

const removeFriendsFromCache = async (userId, friendId) => {
    try {
      const key = `user:${userId}:friends`;
      const result = await redis.del(key);
      return result;
    } catch (error) {
      console.error(error);
      return false;
    }
};

export {
    userPlateFromCache,
    userPlateToCache,
    profileFromCache,
    invalidateProfileFromCache,
    profileToCache,
    addFriendsToCache,
    getFriendsFromCache,
    removeFriendsFromCache
}