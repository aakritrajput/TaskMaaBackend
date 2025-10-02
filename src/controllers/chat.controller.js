import { checkIfMyFriend } from "../cache/user.cache.js";
import { Chat } from "../models/chatModels/chat.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createOneToOneChat = async(req, res) => {
    try {
        const {friendId} = req.params 
        if(chatWith){
            throw new ApiError(400, "Please provide the userId of the user with whom you want to chat !!")
        }
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized Request !!")
        }
        const isFriend = await checkIfMyFriend(userId, friendId)
        if(!isFriend){
            throw new ApiError(400, "Please send a friend request to the user and be his friend to chat !!")
        }

        const chat = await Chat.create({ 
            isGroupChat: false,
            users: [                           // in one to one chat our both users will be roled as 'admin'
                {user: userId, role:'admin'},
                {user: friendId, role: 'admin'},
            ]
        })

        res.status(200).json(new ApiResponse(200, chat, "Successfully created your chat !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'Oops.. There was some Error initiating your chat !!'})
    }
}