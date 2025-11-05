import { invalidateMessagesInChat } from "../cache/socket.cache.js";
import { redis } from "../db/redis.js";
import { Chat } from "../models/chatModels/chat.model.js";
import { Message } from "../models/chatModels/message.model.js";

async function processMessageQueue() {
    const batch = [];
    const keysSet = new Set();
    const messageUpdates = [];
    let moreMessages = true;
    let moreMessageUpdates = true;
    for (let i = 0; i<50; i++){
        // for new messages
        let msg ;
        if(moreMessages){
            const rawMsg = await redis.rpop('message_queue');
            if (rawMsg) {
                const msg = JSON.parse(rawMsg);
                keysSet.add(msg.chatId);
                batch.push(msg);
            }
            
        }
        if(moreMessages && !msg){
            moreMessages = false;
        }

        // for message updates 
        let msgUpdate;
        if(moreMessageUpdates){
            msgUpdate = await redis.rpop('message_update_queue');
            if(msgUpdate){
                messageUpdates.push(JSON.parse(msgUpdate));
            }
        }
        if(moreMessageUpdates && !msgUpdate){
            moreMessageUpdates = false;
        }

        if(!moreMessageUpdates && !moreMessages) break ;
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
        
        const msgUpdates = messageUpdates.map(upd => ({
            updateOne: {
                filter: {id: upd.messageId},
                update: {
                    $set: {
                        status: upd.status
                    }
                }
            }
        }))

        
        await Chat.bulkWrite(updates)
        await Message.bulkWrite(msgUpdates)
    }

}

setInterval(processMessageQueue, 2000) // here i have set the db writes to happen after 2 seconds and for now i even can set it more then it too as not much users will be there so in 2 seconds i think we will not be getting 50 messages - it will hardly be 10 😅