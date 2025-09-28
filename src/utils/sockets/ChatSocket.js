import { Server } from "socket.io";
import { getSocketIdOfUser, invalidateSocketIdForUser, socketIdForUser, messageToCacheQueue, storeOfflineMessage } from "../../cache/socket.cache";

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

            socket.on('send-message', async({senderId, recieverId, message})=> {
                let receiverSocketId = onlineUsers.get(recieverId)
                if(!receiverSocketId){
                    receiverSocketId = await getSocketIdOfUser(recieverId);
                }

                const timestamp = Date.now();

                if (receiverSocketId) {
                    socket.to(receiverSocketId).emit('recieve-message', { senderId, recieverId, message, timestamp });
                    await messageToCacheQueue({senderId, recieverId, message, timestamp})
                } else {
                    console.log(`User ${recieverId} is offline. Storing message for later delivery.`);
                    await storeOfflineMessage(recieverId, { senderId, message, timestamp });
                }
            })

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