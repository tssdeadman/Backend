import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from 'jsonwebtoken';
import {User} from '../models/user.model.js'
// import { ApiError } from "../utils/ApiError";

export const jwtVarify = asynchandler(async (req,res,next)=>{
    try {

        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","");

        
        if (!token) {
            throw new ApiError(401,"Unauthorized Token");
        }
    
        const decodetoken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        

        const user = await User.findById(decodetoken._id).select(" -password -refreshToken ");
        
        if (!user) {
            throw new ApiError(401,"Invalid Access Token")
        }
    
        req.user = user;
        next();

    } catch (error) {
        throw new ApiError(401,error?.message || "Inavlid Access Token");
    }
})