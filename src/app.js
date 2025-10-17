import cookieParser from 'cookie-parser'
import express from 'express'
import cors from 'cors'
import http from 'http';
import chatSocket from './sockets/ChatSocket.js';

// ---- Importing routes -------
import userRouter from './routes/user.routes.js'
import taskRouter from './routes/task.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'

const app = express()

app.use(cors({
    origin: process.env.ORIGIN,
    credentials: true
}))

app.use(cookieParser())
app.use(express.json({limit: '50kb'}))
app.use(express.urlencoded({extended: true, limit: '25kb'}))
app.use(express.static('public'))


app.use('/api/user', userRouter)
app.use('/api/tasks', taskRouter)
app.use('/api/dashboard', dashboardRoutes)

const server = http.createServer(app);

chatSocket(server);

export default server