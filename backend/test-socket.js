const { io } = require('socket.io-client');
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('chat:message', { 
    text: 'What is the weakest part of my setup and why?', 
    workspace: [
      { id: '1', name: 'Smart Standing Desk', type: 'desk', price: 799 },
      { id: '2', name: 'Ergonomic Chair', type: 'chair', price: 650 },
      { id: '3', name: 'Ultrawide Monitor', type: 'monitor', price: 1199 },
      { id: '4', name: 'Mechanical Keyboard', type: 'keyboard', price: 150 },
      { id: '5', name: 'Wireless Mouse', type: 'mouse', price: 99 }
    ]
  });
});

socket.on('ai:stream:chunk', (data) => process.stdout.write(data.text));
socket.on('ai:response', (data) => {
  console.log('\n\nFinal:', data);
  process.exit(0);
});
socket.on('workspace:update', (data) => console.log('\nWorkspace Update:', data));
