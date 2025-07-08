import {asynchandler} from '../utils/asynchandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'


const registerUser = asynchandler( async(req,res)=>{
    res.status(200).json({
        messsage:'Register Access',
    })

    const {fullname, username ,email , password} = req.body;
    console.log("Email :", email);

    if ([fullname, username ,email , password].some((field)=> field.trim()=== "")){
        throw new ApiError(400,"All Fields Are Require")
    }

    const existeduser = User.findOne({
        $or:[{ username },{ email }]
    });

    if (existeduser) {
        throw new ApiError(409,"Already Existed USer");
    }

    const avatarlocalpath = req.files?.avatar[0]?.path;
    const coverimagelocalpath = req.files?.coverImage[0]?.path;
    
    if (!avatarlocalpath) {
        throw new ApiError(400,"Avatar is Required");
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath);
    const coverimage = await uploadOnCloudinary(coverimagelocalpath);

    if (!avatar) {
        throw new ApiError(400,"Avatar is Required");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverimage: coverimage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    })

    const createduser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createduser) {
        throw new ApiError(500,"Wrogn with Registering User");
    }

    return res.status(201).json(
        new ApiResponse(200, createduser,"User Register Successfully")
    )
})

export {registerUser};