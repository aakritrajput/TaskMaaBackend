import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { getLeaderBoard, getMyPerformance, updateStreak } from "../controllers/stats.controller.js";

const router = Router()

router.route('/getPerformanceStats').get(verifyJwt, getMyPerformance)
router.route('/leaderboard').get(verifyJwt, getLeaderBoard)
router.route('/updateStreak/:action').get(verifyJwt, updateStreak)

export default router;