import {asynchandler} from '../utils/asynchandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const generate_Access_and_Refresh_Token = async (userId)=>{
    try {
        const user = await User.findById(userId);
     ;
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500,"Something Went Wrong while generation Refresh And Access Token");
    }
}


const registerUser = asynchandler( async(req,res)=>{
    
    // What data should taken from user

    const {fullname, username ,email , password} = req.body;

    console.log("Email :", email);
    console.log("Fullname :", fullname);
    console.log("Password :", password);
    console.log("Username :", username);

    // Checking Valid Data of User it can also make logic in another folder

    if ([fullname, username ,email , password].some((field)=> field.trim()=== ""))
    {
        throw new ApiError(400,"All Fields Are Require")
    }

    // [fullname, username, email, password].map(field => field.trim() === "").includes(true) alternative of some using map important to use include
    //--------------------------------------------------------------------
    
    // Checking Existed User

    const existeduser = await User.findOne({
        $or:[{ username },{ email }]
    });


    if (existeduser) {
        throw new ApiError(409,"Already Existed USer");
    }

    // finding localpath for cloudinary so it can upload on cloudinary

    const avatarlocalpath = req.files?.avatar?.[0]?.path;
    const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

    
// req.files = {
//   avatar: [
//     index 0 {
//       fieldname: 'avatar',
//       originalname: 'photo.jpg',
//       encoding: '7bit',
//       mimetype: 'image/jpeg',
//       destination: 'uploads/',
//       filename: 'avatar-1234.jpg',
//       path: 'uploads/avatar-1234.jpg', // 👈 yahi milega
//       size: 12345
//     },
// index 1 {}
//   ]
// }

// console.log(req.files.avatar.encoding);
    
    
    if (!avatarlocalpath) {
        throw new ApiError(400,"Avatar path required");
    }

    // Uploading Avatar and coverimage on cloudinary

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

const loginUser = asynchandler( async (req,res)=>{
    const {username,email,password} = req.body;

    if (!username && !email) {
        throw new ApiError(400,"Username or email is required");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404,"user does not exit")
    }

    const passwordValid = await user.isPasswordCorrect(password);


    if (!passwordValid) {
        throw new ApiError(401,"Password is Wrogn");    
    }


    const {accessToken,refreshToken} = await generate_Access_and_Refresh_Token(user._id);

    // we need find user again 
    console.log("Access :", accessToken,refreshToken);
    
    const loggeduser = await User.findById(user._id)
    .select(" -password -refreshToken")
    
    
    const options={
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggeduser, accessToken,refreshToken
            },
            "User LoggedIn Successfully"
        )
    )
})

const logoutUser = asynchandler( async(req,res)=>{
   await User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken: 1,
            },
        },
        {
            new:true,
            // to return new update User detail [{58:34}]
        }
    )

    const options={
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{},"User Successfully Logout"))
})

export {registerUser, loginUser, logoutUser};