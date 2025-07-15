import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'
import { jwtVarify } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
    {
        name:"avatar",
        maxcount:1,
    },
    {
        name:"coverimage",
        maxCount:1,
    }
]),
    registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").post(jwtVarify, logoutUser);

// here i using two function so route can only execute first function jwtverify but i have used [{next}] in jwt verify which used to also execute function logoutUser after complete of jwtverify therefore [{next}] is important
export  default router;