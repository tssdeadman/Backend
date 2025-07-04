import mongoose, { Mongoose, Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        id:{
            type:String,
            require:true,
            unique:true
        },
        vedioFile:{
            type:String, 
            // Cloud base url
            require:true,
        },
        thumbnail:{
            type:String,
            require:true,
        },
        owner:{
            type:Schema.Types.ObjectId,
            ref:'User'
        },
        title:{
            type:String,
            require:true,
        },
        description:{
            type:String,
            require:true,
        },
        duration:{
            type:Number,
            require:true,

        },
        views:{
            type:Number,
            default:0,
        },
        isPublished:{
            type:Boolean,
            default:true,
        },
        createdAt:{
            type:Date,
            require:true,
        },
        updatedAt:{
            type:Date,
            require:true,
        }
    },
    {timestamps:true})

    videoSchema.plugin(mongooseAggregatePaginate)

    export const Video = Mongoose.model('Video',videoSchema)