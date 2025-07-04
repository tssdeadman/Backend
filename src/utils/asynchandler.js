// In the case of login , register ,vedio upload and many task in which use of data base it will coonects with data base so we need to create the data base connect function so to make structure error and reuse the function.

const asynchandler = (asyncrequest)=>{
    return (req,res,next)=>{
        Promise.resolve(asyncrequest(req,res,next)).catch((error)=>
            next(error))
    }
}

export {asynchandler} 