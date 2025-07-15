import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express();

//cors policy not allowed share data between frontend and backend as it has different host so here using middleware just true it

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}))

app.use(express.json({limit:"16kb"}))

// Parses incoming requests with x-www-form-urlencoded payloads (like form submissions).
// extended: true: Uses the qs library for rich object parsing (allows nested objects).
app.use(express.urlencoded({extended:true,limit:"16kb"}))

// Serves static files (like HTML, CSS, JS, images) from the "public" folder.
app.use(express.static("public"))

app.use(cookieParser()) 
// Router Import

import userRouter from './routes/user.router.js'

// Router Declaration

app.use("/api/v1/users",userRouter);

// http://localhost:8000/api/v1/users/register

export default app;

