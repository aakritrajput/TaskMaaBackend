import { Server } from "socket.io";
import { getSocketIdOfUser, invalidateSocketIdForUser, socketIdForUser, messageToCacheQueue, storeOfflineMessage, updateUnreadCount } from "../cache/socket.cache";
import { v4 as uuidv4 } from 'uuid';

export default function chatSocket(server){
    const io = new Server(server, {
        cors: {
            origin: process.env.ORIGIN,
            credentials: true,
        }
    })

    const onlineUsers = new Map(); // map for storing online users in-memory -- will not take much space even if lakhs of users then also 10 to 15 mb of RAM consumed and can use this to quickly lookup for users socketID's

    io.on('connection', async(socket) => { // right now we are just handling the basic errors and it can be extended to handle all deeper errors like which may come from caching functions 
        try {
            console.log('User connected: ', socket.id);
            const userId = socket.handshake.query.userId
            if (!userId) return ;

            onlineUsers.set(userId, socket.id) // for quickly looking up socket id's in memory 
            await socketIdForUser(userId, socket.id); // if users not in the memory of the same server then we can query redis for the users socketIDs

            // ----------- One to One chats ---------------

            socket.on('send-message', async({chatId, senderId, recieverId, text})=> { // here we are also collecting the chat id so that if there is new chat then if chat id is not provided we can create a new chat in db
                let receiverSocketId = onlineUsers.get(recieverId)
                if(!receiverSocketId){
                    receiverSocketId = await getSocketIdOfUser(recieverId);
                }

                const message = {
                    id: uuidv4(),   // generating unique messageId for future reference !!
                    chatId,
                    senderId,
                    recieverId,
                    text,
                    timestamp: Date.now(),
                    status: 'sent'
                };

                if (receiverSocketId) {
                    await messageToCacheQueue(message)

                    // sending message to reciever !!
                    socket.to(receiverSocketId).emit('recieve-message', message);

                    // Ack sender 
                    socket.emit('message_sent', {tempId: data.tempId, message});
                } else {
                    console.log(`User ${recieverId} is offline. Storing message for later delivery.`);
                    await storeOfflineMessage(message);
                }
            })

            socket.on('delivered_ack', ({messageId, chatId, senderId}) => {
                io.to(senderId).emit('message_delivered', {messageId, chatId})
            })

            socket.on('read_ack', async ({ chatId, messageIds, userId }) => {
                await updateUnreadCount(userId, chatId);
                // Notifying sender !!
                io.to(senderId).emit('messages_read', { chatId, messageIds });
            });

            // -------- On disconnect -----------

            socket.on('disconnect', async() => {
                console.log('User disconnected: ', socket.id)
                onlineUsers.delete(userId)
                await invalidateSocketIdForUser(userId);
            });

        } catch (error) {
            console.log('Error during connection: ', error)
        }
    })
}