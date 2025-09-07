import dotenv from 'dotenv'
import app from './app.js'
import connectDB from './db/index.js'

dotenv.config({  // just a double check as already configured in start or dev script
    path: './.env'
})

connectDB().then(()=>{
    app.on("error", (error)=>{
        console.log("Error: ", error)
        throw error
    })
    app.listen(process.env.PORT || 5000, ()=>{
        console.log(`hurray... Server started running at port: ${process.env.PORT}`)
    })
}).catch((error)=> {
    console.log("No way... Connection to database failed !!", error)
})
