import { Router } from "express";
import { authCheck, login, register, deleteAccountHandler, getMyFriends, logout, searchByUsername, getUserProfile, sendFriendRequest, responseToFriendRequest, getRequestsIRecieved, editProfile } from "../controllers/user.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route('/register').post(register)
router.route('/login').post(login)
router.route('/authCheck').get(verifyJwt, authCheck)
router.route('/getFriends').get(verifyJwt, getMyFriends)
router.route('/delete').delete(verifyJwt, deleteAccountHandler)
router.route('/logout').get(verifyJwt, logout)
router.route('/search').get(verifyJwt, searchByUsername)
router.route('/profile/:userId').get(verifyJwt, getUserProfile)
router.route('/sendFriendRequest/:friendId').post(verifyJwt, sendFriendRequest)
router.route('/responseToFriendRequest/:friendId').post(verifyJwt, responseToFriendRequest)
router.route('/requestsIRecieved').get(verifyJwt, getRequestsIRecieved)
router.route('/editProfile').put(verifyJwt, upload.single("profilePicture"), editProfile)

export default router;