import { Server } from "socket.io";

export default function chatSocket(server){
    const io = new Server(server, {
        cors: {
            origin: process.env.ORIGIN,
            credentials: true,
        }
    })

    io.on('connection', (socket) => {
        console.log('User connected: ', socket.id);

        socket.on('join_chat', (userId) => socket.join(userId));
        socket.on('send_message', (data) => io.to(data.receiverId).emit('recieve_message', data));
        socket.on('disconnect', () => console.log('User disconnected: ', socket.io))
    })
}