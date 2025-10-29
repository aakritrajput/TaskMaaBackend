import { invalidateMessagesInChat } from "../cache/socket.cache.js";
import { redis } from "../db/redis";
import { Chat } from "../models/chatModels/chat.model.js";
import { Message } from "../models/chatModels/message.model.js";

async function processMessageQueue() {
    const batch = [];
    const keysSet = new Set();
    for (let i = 0; i<50; i++){
        const msg = await redis.rpop('message_queue');
        if (!msg) break;
        keysSet.add(msg.chatId)
        batch.push(JSON.parse(msg));
    }

    if(batch.length) {
        // saving message to message model 
        await Message.insertMany(batch);
        await invalidateMessagesInChat([...keysSet])

        // saving basic info in chat model !!

        const updates = batch.map(msg => ({
            updateOne: {
                filter: {_id: msg.chatId},
                update: {
                    $set: {
                        lastMessage: {
                            text: msg.content,
                            senderId: msg.senderId,
                            timestamp: msg.timestamp,
                        }
                    }
                }
            }
        }));

        
        await Chat.bulkWrite(updates)
    }

}

setInterval(processMessageQueue, 2000) // here i have set the db writes to happen after 2 seconds and for now i even can set it more then it too as not much users will be there so in 2 seconds i think we will not be getting 50 messages - it will hardly be 10 😅