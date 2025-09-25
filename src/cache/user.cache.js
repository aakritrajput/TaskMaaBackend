import { redis } from "../db/redis";

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

const profileFromCache = async(username) => {
    try {
        const key = `user:profile:${username}`
        const data = await redis.get(key)
        return data ? JSON.parse(data) : null ;
    } catch (error) {
        console.log(error)
        return null;
    }
}

export {
    userPlateFromCache,
    userPlateToCache,
    profileFromCache
}