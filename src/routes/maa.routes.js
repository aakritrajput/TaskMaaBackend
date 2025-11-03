import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import { getMaaResponse } from "../controllers/maa.controller.js";

const router = Router()

router.route("/getResponse/:type").get(verifyJwt, getMaaResponse)

export default router;