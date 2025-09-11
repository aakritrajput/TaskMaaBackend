import {User} from "../models/user.model.js";

const register = async(req, res) => {
    try {
         const {username, email, password, confirmPassword} = req.body
    
        const existingUser = await User.find({
            $or: [
                { email },
                { username }
            ]
        })
        if(existingUser.length > 0){
            console.log(existingUser)
            throw new ApiError(400, "user already exists with the given username or email!!")
        }
        const user = await User.create({
            username,
            email,
            password,
        })
    } catch (error) {
        
    }
}