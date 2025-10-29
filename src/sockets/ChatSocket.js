import { Server } from "socket.io";
import { getSocketIdOfUser, invalidateSocketIdForUser, socketIdForUser, messageToCacheQueue, storeOfflineMessage, updateUnreadCount, getUsersOfflineMessages, getGroupChatMembers, storeOfflineMessageForGroups } from "../cache/socket.cache.js";
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
            console.log('Got the user id: ', userId)
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

                await messageToCacheQueue(message) // we will store the messages in cache queue for some time and then bg worker will push it to db 

                if (receiverSocketId) { // for online users emit the message

                    // sending message to reciever !!
                    io.to(receiverSocketId).emit('recieve-message', message);

                } else {  // for offline ones store them in cache !!
                    console.log(`User ${recieverId} is offline. Storing message for later delivery.`);
                    await storeOfflineMessage(message);
                }

                socket.emit('message_sent', message)
            })

            // ----------- Group chats ---------------
            

            socket.on('send_group_message', async (data) => {
                const { chatId, senderId, content } = data;
                const members = await getGroupChatMembers(chatId);
                const message = {
                    id: uuid(),
                    chatId,
                    senderId,
                    content,
                    timestamp: Date.now(),
                    deliveredTo: [],
                    readBy: [],
                    status: 'sent',
                };

                const onlineMembersWithSocketIds = members
                .filter(member => onlineUsers.has(member))
                .map(member => ({ member, socketId: onlineUsers.get(member) }));  // Improvement: here we are only checking online users in the memory object and if the group members are not on the same server then it will consider them offline !! -- therefore in future can enhance it to query the cache for online users !!

                const offlineMembers = members.filter(member => !onlineUsers.has(member))

                // emiting messages to online users !!

                const messageWithReceiverIds = {
                    ...message,
                    receiverIds: members
                }
                
                await messageToCacheQueue(messageWithReceiverIds)

                if(onlineMembersWithSocketIds){
                    const onlineSockets = onlineMembersWithSocketIds.map((memberWithSocket) => memberWithSocket.socketId)
                    io.to(onlineSockets).emit(message)
                }
                if(offlineMembers){
                    const offlineMessageWithReceiverIds = {
                        ...message,
                        receiverIds: offlineMembers,
                    }

                    await storeOfflineMessageForGroups(offlineMessageWithReceiverIds)
                }
            
                socket.emit('message_sent', { message }); // the message in itself has that temp. id which will be permanent in our case as we are adding that id to database too!!
            });



            // ---------- For both - group and one to one messages ----------

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