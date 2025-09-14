import dotenv from 'dotenv'
import app from './app.js'
import connectDB from './db/index.js'
import { redis } from './db/redis.js'

dotenv.config({  // just a double check as already configured in start or dev script
    path: './.env'
})

async function startServer(){
    try {
        await connectDB();
        
        const pong = await redis.ping();
        console.log("Redis ping response: ", pong) // it should give PONG

        app.listen(process.env.PORT || 5000, ()=>{
           console.log(`hurray... Server started running at port: ${process.env.PORT}`)
        })

    } catch (error) {
        console.error("Ohh.. No !! Server startup failed :", error);
        process.exit(1);
    }
}

startServer()