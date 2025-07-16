import {asynchandler} from '../utils/asynchandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import  jwt  from 'jsonwebtoken'

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

    //    console.log("req.body..=", req.body);

    //    req.body..= [Object: null prototype] {
    //   username: 'dd12',
    //   email: 'dd@14',
    //   password: '1245789',
    //   fullname: 'deepak'
    // }


    // console.log("req.files..=", req.files);

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


    // console.log("req.body.email..=", req.body.email);
    // req.body.email..= dd@14
    
    // Multer automatically:
    // Form-data body parse karta hai
    // File ko uploads/ folder me save karta hai
    // [[req.files object me file ka details bhar deta hai]]

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
    // here return will be response
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

    // here user created and save automaticaly so pre.password runs and password get hashed.

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

// the case when access token of user expire then frontend send request of 404 with refresh token
//  that have in cookies and in backenend we take incoming refresh token compare with .env token by jwt verify 
// and then find user by id then generate new access and refresh token send to user.

// -------------------------------------------------------------------------
// [Belowe this line is condition where user has been login and using our server then it means to get data from user just do req.user]
// -------------------------------------------------------------------------

const refreshAccesstoken= asynchandler( async(req,res)=>{
    const incomingrefreshtoken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingrefreshtoken) {
        throw new ApiError(401,"Not have refreshtoken in cookies");
    }

    try {
        const decodetoken = jwt.verify(incomingrefreshtoken,process.env.REFRESH_TOKEN_SECRET);
    
        // if (!decodetoken) {
        //     throw new ApiError(401, "invalid incoming token");
        // }
    
        const user = await User.findById(decodetoken?._id)
    
        if (!user) {
            throw new ApiError(401, "Not user find from incoming token")
        }
    
        if (incomingrefreshtoken !== user?.refreshToken) {
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const {accessToken, newrefreshToken} = await generate_Access_and_Refresh_Token(user._id)
    
        const options={
            httpOnly: true,
            secure: true,
        }
    
        res
        .status(200)
        .cookie("accessToken",options)
        .cookie("refreshToken",options)
        .json(new ApiResponse(200,
        {
            accessToken, refreshToken:newrefreshToken,
        },
        "Access token refreshed"
    ))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

// Update Password, Get current user, update Profile

const updatecurrentpassword = asynchandler(async(req,res)=>{
    const{oldpassword,newpassword}= req.body;

    if (!oldpassword || !newpassword) {
        throw new ApiError(401,"Please Enter Password");
    }

    const user = await User.findById(req.user._id);

    const newpasswordcorect = user.isPasswordCorrect(newpassword,user.password);

    if (!newpasswordcorect) {
        throw new ApiError(401,"the old password is wrogn");
    }

    user.password = newpassword;

    user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,
        {},"Your Password Changed Successfully"
    ))
})

// get current user

const getcurrentuser = asynchandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "The current user get successfully"))
})

// Update Profile

const updateAccount = asynchandler(async(req,res)=>{
    const {fullname,email} = req.body;

    if (!fullname && !email) {
        throw new ApiError(401,"Provide Fullname or Username");
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set:{fullname:fullname, email:email},
        },
        {
            new:true,
        }
    )

    if (!user) {
        throw new ApiError(401,"Inavalid User");
    }

    user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"User Fullname and Email has been changed"));
})

const updateAvatar = asynchandler(async (req,res)=>{

    const avatarlocalpath = req.file?.path;
    
    // here when we upload it will be single file so need mentioned avatar file and no need array

    if (!avatarlocalpath) {
        throw new ApiError(401,"Please Upload File");
    }

    const avatar = await uploadOnCloudinary(avatarlocalpath);

    if (!avatar.url) {
        throw new ApiError(401,"Something Wrogn while Avatar upload on clodinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{avatar:avatar.url},
        },
        {
            new:true,
        }).select("-password");
        // here we return user 

        return res
        .status(200)
        .json(new ApiResponse(200,user,"Avatar Update Successfully"))
})

const updateCoverimage = asynchandler(async (req,res)=>{

    const coverimagelocalpath = req.file?.path;

    if (!coverimagelocalpath) {
        throw new ApiError(401,"Please Upload Coverimage");
    }

    const coverimage = await uploadOnCloudinary(coverimagelocalpath);

    if (!coverimage) {
        throw new ApiError(401,"Something Wrogn when coverimage is upload");
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set:{coverimage:coverimage.url},
        },
        {
            new:true,
        }).select("-password");

        return res
        .status(200)
        .json(new ApiResponse(200, user, "Coverimage update successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser, 
    refreshAccesstoken,
    updatecurrentpassword,
    getcurrentuser,
    updateAccount,
    updateAvatar,
    updateCoverimage
    };