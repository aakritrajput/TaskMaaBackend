import { Router } from "express";
import { authCheck, login, register, deleteAccountHandler, getMyFriends } from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route('/register').post(register)
router.route('/login').post(login)
router.route('/authCheck').get(verifyJwt, authCheck)
router.route('/getFriends').get(verifyJwt, getMyFriends)
router.route('/delete').delete(verifyJwt, deleteAccountHandler)

export default router;