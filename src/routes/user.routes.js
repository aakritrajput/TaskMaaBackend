import { Router } from "express";
import { authCheck, login, register } from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route('/register').post(register)
router.route('/login').post(login)
router.route('/authCheck').get(verifyJwt, authCheck)

export default router;