import { addChatIdToMultipleUsers, messagesToCache, messagesFromCache, addGroupChatMembersToCache, getChatIdsOfUser, storeChatIdsOfUser } from "../cache/socket.cache.js";
import { getFriendsFromCache } from "../cache/user.cache.js";
import { Chat } from "../models/chatModels/chat.model.js";
import { Message } from "../models/chatModels/message.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { checkIsMyFriend } from "./user.controller.js";

const createOneToOneChat = async(req, res) => {
    try {
        const {friendId} = req.params
        if(!friendId){
            throw new ApiError(400, "Please provide the userId of the user with whom you want to chat !!")
        }
        const userId = req.user._id
        if(!userId){
            throw new ApiError(401, "Unauthorized Request !!")
        }
        const isFriend = await checkIsMyFriend(userId, friendId)
        if(!isFriend){
            console.log('not friend !!!')
            throw new ApiError(400, "Please send a friend request to the user and be his friend to chat !!")
        }

        try {
            const chat = await Chat.create({ 
                isGroupChat: false,
                users: [                           // in one to one chat our both users will be roled as 'admin'
                    {user: userId, role:'admin'},
                    {user: friendId, role: 'admin'},
                ]
            })
    
            await addChatIdToMultipleUsers([userId, friendId], chat._id)
    
            res.status(200).json(new ApiResponse(200, chat, "Successfully created your chat !!"))
        } catch (error) {
            if (err.code === 11000) {
              // Duplicate uniquePairKey
              throw new ApiError(400, 'The chat room already exist with given user !!')
            }
        }
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

const getMessagesOfChat = async(req, res) => { // if we in future want scale then we will implement pagination here
    try {
        const {chatId} = req.params
        if(!chatId){
            throw new ApiError(400, "Please provide a valid chat id !!")
        }

        const MessagesFromCache = await messagesFromCache(chatId)
        if(MessagesFromCache){
            res.status(200).json(new ApiResponse(200, MessagesFromCache, "Here are your chats !!"))
            return ;
        }

        const messagesFromDb = await Message.find({
            chatId
        })

        await messagesToCache(chatId, messagesFromDb)

        res.status(200).json(new ApiResponse(200, messagesFromDb, "Here are your chats !!"))
    } catch (error) {
        res.status(error.statusCode || 500).json({message: error.message || 'Oops.. There was some Error getting messages of this chat !!'})
    }
}

export {
    createOneToOneChat,
    createGroupChat,
    getChatInterface,
    getMessagesOfChat,
}