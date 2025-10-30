import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { createOneToOneChat, getChatInterface, getMessagesOfChat } from "../controllers/chat.controller.js";

const router = Router()

router.route('/getChatInterface').get(verifyJwt, getChatInterface)
router.route('/getMessages/:chatId').get(verifyJwt, getMessagesOfChat)
router.route('/createOneToOneChat/:friendId').get(verifyJwt, createOneToOneChat)

export default router