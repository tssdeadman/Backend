import mongoose,{Schema, Types} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

const userSchema = new Schema (
    {
        username:{
            type: String,
            required: true,
            unique : true,
            trim: true,
            lowecase: true,
            index: true,
            // index is used to searching in data base
        },
        fullname:{
            type: String,
            required: true,
            trim: true,
            lowecase: true,
            index: true,
            // index is used to searching in data base
        },
        email:{
            type: String,
            required: true,
            unique : true,
            trim: true,
            lowecase: true,
            index: true,
            // index is used to searching in data base
        },
        avatar:{
            type: String,
            required: true,
        },
        coverimage:{
            type: String,
        },
        watchHistory:[
            {
                type: Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type: String,
            required:true,
        },
        refreshToken:{
            type: String,
        }
    },
    {timestamps:true,}
)
// here in pre we can not use call back func ()=> becouse we need instance or this from userSchema
// as ()=> does not give this or instance

// why this pre becouse when user write password at forst time so it should not save in string it should save save in ecrypt
userSchema.pre('save', async function (next){
    if(!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password,10);
    next();
})

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password,this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            username: this.username,
            email: this.email,
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}

export const User = mongoose.model('User',userSchema) 