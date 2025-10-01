import { Server } from "socket.io";
import { getSocketIdOfUser, invalidateSocketIdForUser, socketIdForUser, messageToCacheQueue, storeOfflineMessage, updateUnreadCount, getUsersOfflineMessages } from "../cache/socket.cache";
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

            // now first if there were any offline messages for this user then we will emit that immediately 

            const messages = await getUsersOfflineMessages(userId);
            if (messages.length > 0){
                socket.emit('offline-messages', messages)
            }

            // these below commands are for miantaining the state of online users 
        
            onlineUsers.set(userId, socket.id) // for quickly looking up socket id's in memory 
            await socketIdForUser(userId, socket.id); // if users not in the memory of the same server then we can query redis for the users socketIDs

            // ----------- One to One chats ---------------

            socket.on('send-message', async({chatId, senderId, recieverId, content})=> { // here we are also collecting the chat id so that if there is new chat then if chat id is not provided we can create a new chat in db
                let receiverSocketId = onlineUsers.get(recieverId)
                if(!receiverSocketId){
                    receiverSocketId = await getSocketIdOfUser(recieverId);
                }

                const message = {
                    id: uuidv4(),   // generating unique messageId for future reference !!
                    chatId,
                    senderId,
                    recieverId,
                    content,
                    timestamp: Date.now(),
                    status: 'sent'
                };

                if (receiverSocketId) {
                    await messageToCacheQueue(message)

                    // sending message to reciever !!
                    io.to(receiverSocketId).emit('recieve-message', message);

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

            // ----------- Group chats ---------------
             // in this we are handling cache functions here only as we need to create a loop for both emiting and caching the unread count -- so why not do that here only !!

             // TODO: we have to still get the socket id's of the members not there user id's and with that handle offline users -- and also match the storing data with actual db model !!!
            socket.on('send_group_message', async (data) => {
                const { chatId, senderId, content } = data;
                const members = await redis.smembers(`group:${chatId}:members`);
            
                const message = {
                    id: uuid(),
                    chatId,
                    senderId,
                    content,
                    timestamp: Date.now(),
                    deliveredTo: [],
                    readBy: []
                };
            
                await redis.lpush('message_queue', JSON.stringify(message));
            
                // Update last message
                await redis.hset(`last_message:${chatId}`,
                  'text', content,
                  'timestamp', message.timestamp
                );
            
                // Increment unread count for each member
                for (const member of members) {
                  if (member !== senderId) {
                    await redis.hincrby(`unread_count:${member}`, chatId, 1);
                    io.to(member).emit('receive_message', message);
                  }
                }
            
                socket.emit('message_sent', { tempId: data.tempId, message });
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