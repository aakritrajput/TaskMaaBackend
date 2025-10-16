import Router from 'express'
import { verifyJwt } from '../middlewares/auth.middleware.js'
import { addTask, deleteTask, editTask, getGeneralTasks, getTodaysTasks } from '../controllers/task.controller.js'

const router = Router()

router.route('/createTask').post(verifyJwt, addTask)
router.route('/todaysTask').get(verifyJwt, getTodaysTasks)
router.route('/generalTasks').get(verifyJwt, getGeneralTasks)
router.route('/deleteTask/:taskId').delete(verifyJwt, deleteTask)
router.route('/editTask/:taskId').patch(verifyJwt, editTask)

export default router