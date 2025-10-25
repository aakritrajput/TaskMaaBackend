import { addChatIdToMultipleUsers, addGroupChatMembersToCache, getChatIdsOfUser, storeChatIdsOfUser } from "../cache/socket.cache.js";
import { checkIfMyFriend, getFriendsFromCache } from "../cache/user.cache.js";
import { Chat } from "../models/chatModels/chat.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createOneToOneChat = async(req, res) => {
    try {
        const {friendId} = req.params 
        if(!chatWith){
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

        await storeChatIdsOfUser(userId, chat._id)

        res.status(200).json(new ApiResponse(200, chat, "Successfully created your chat !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'Oops.. There was some Error initiating your chat !!'})
    }
}

const createGroupChat = async(req, res) => {
    try {
        const {participants=[], name } = req.params 
        if(!name){
            throw new ApiError(400, "Please provide the name of the group !!")
        }
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized Request !!")
        }
        const friends = await getFriendsFromCache(userId)
        
        const participantIds = participants.filter((participant) => friends.includes(participant))
        participants = participantIds.map((participant) => ({user: participant, role: 'participant'}))

        const chat = await Chat.create({
            isGroupChat: true,
            groupName: name,
            users: [                           // in one to one chat our both users will be roled as 'admin'
                {user: userId, role:'admin'},
                ...participants
            ]
        })

        await addGroupChatMembersToCache(chat._id, [userId, ...participantIds])
        await addChatIdToMultipleUsers([...participantIds, userId], chat._id)

        res.status(200).json(new ApiResponse(200, chat, "Successfully created your group chat !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'Oops.. There was some Error creating your group chat !!'})
    }
}

const getChatInterface = async(req, res) => {
    try {
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized Request !!")
        }

        const chatIds = await getChatIdsOfUser(userId) // at this stage we are only getting chatIds from cache and will not enquire db for this but in future can add extra logic for the same 
        // AGAIN: If by chance there would not be any chatIds so we need to figure out a solution (if our app in future will become daily use to app ) for getting chatIds of the user
        if(chatIds.length == 0){
            return res.status(200).json(new ApiResponse(200, [], "You don't have any chatIds yet"))
        }

        const chats = await Chat.find({
            _id: {$in: chatIds}
        }).populate("users.user", "username profilePicture").sort({ updatedAt: -1 });

        res.status(200).json(new ApiResponse(200, chats, "Here are your chats !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'Oops.. There was some Error creating your group chat !!'})
    }
}

export {
    createOneToOneChat,
    createGroupChat,
    getChatInterface,
}