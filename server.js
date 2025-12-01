const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static('public'));

let users = []; // {id, gender}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (data) => {
    users = users.filter(u => u.id !== socket.id);
    users.push({ id: socket.id, gender: data.gender });
    console.log(`User ${socket.id} joined as ${data.gender}`);
    matchUsers();
  });

  socket.on('offer', (data) => {
    socket.to(data.room).emit('offer', data.offer);
  });

  socket.on('answer', (data) => {
    socket.to(data.room).emit('answer', data.answer);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(data.room).emit('ice-candidate', data.candidate);
  });

  socket.on('next', () => {
    users = users.filter(u => u.id !== socket.id);
    socket.emit('disconnected');
    matchUsers();
  });

  socket.on('disconnect', () => {
    users = users.filter(u => u.id !== socket.id);
    console.log('User disconnected:', socket.id);
  });
});

function matchUsers() {
  for (let i = 0; i < users.length; i++) {
    const user1 = users[i];
    const user2 = users.find(u => u.id !== user1.id && u.gender !== user1.gender);
    if (user2) {
      const room = `${user1.id}-${user2.id}`;
      io.to(user1.id).emit('matched', { room });
      io.to(user2.id).emit('matched', { room });
      console.log(`Match: ${user1.gender} <-> ${user2.gender}`);
      return;
    }
  }
}

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
