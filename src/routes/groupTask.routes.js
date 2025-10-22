import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { createGroupTask, editGroupTask, getMembersOfGroupTask, getMyGroupTasks, getPublicGroupTasks } from "../controllers/groupTask.controller.js";

const router = Router()

router.route('/myGroupTasks').get(verifyJwt, getMyGroupTasks)
router.route('/publicGroupTasks').get(verifyJwt, getPublicGroupTasks)
router.route('/createGroupTask').post(verifyJwt, createGroupTask)
router.route('/groupTaskMembers/:id').get(verifyJwt, getMembersOfGroupTask)
router.route('/editGroupTask/:groupTaskId').post(verifyJwt, editGroupTask)

export default router;