import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { createGroupTask, deleteGroupTask, editGroupTask, getMembersOfGroupTask, getMyGroupTasks, getPublicGroupTasks, markCompleted, participateInPublicGroupTask, toggleGroupTaskStatus } from "../controllers/groupTask.controller.js";

const router = Router()

router.route('/myGroupTasks').get(verifyJwt, getMyGroupTasks)
router.route('/publicGroupTasks').get(verifyJwt, getPublicGroupTasks)
router.route('/createGroupTask').post(verifyJwt, createGroupTask)
router.route('/groupTaskMembers/:id').get(verifyJwt, getMembersOfGroupTask)
router.route('/editGroupTask/:groupTaskId').post(verifyJwt, editGroupTask)
router.route('/deleteGroupTask/:groupTaskId').delete(verifyJwt, deleteGroupTask)
router.route('/markComplete/:groupTaskId').get(verifyJwt, markCompleted)
router.route('/toggleGroupTask/:groupTaskId').get(verifyJwt, toggleGroupTaskStatus)
router.route('/participateInPublicGroupTask/:groupTaskId').get(verifyJwt, participateInPublicGroupTask)

export default router;