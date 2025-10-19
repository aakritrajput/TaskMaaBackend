import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { getMyGroupTasks, getPublicGroupTasks } from "../controllers/groupTask.controller.js";

const router = Router()

router.route('/myGroupTasks').get(verifyJwt, getMyGroupTasks)
router.route('/publicGroupTasks').get(verifyJwt, getPublicGroupTasks)

export default router;