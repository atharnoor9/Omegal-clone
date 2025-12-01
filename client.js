const socket = io();
let localStream, peerConnection;
let currentRoom = null;

const genderSelect = document.getElementById('gender');
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusDiv = document.getElementById('status');

async function joinChat() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
      audio: true
    });
    localVideo.srcObject = localStream;
    socket.emit('join', { gender: genderSelect.value });
    statusDiv.textContent = '🔍 Finding match...';
    startBtn.disabled = true;
  } catch (e) {
    alert('Camera/Mic allow karo!');
  }
}

socket.on('matched', (data) => {
  currentRoom = data.room;
  statusDiv.textContent = '✅ Connected!';
  nextBtn.disabled = false;
  createPeerConnection();
});

function createPeerConnection() {
  const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('ice-candidate', { room: currentRoom, candidate: event.candidate });
    }
  };

  peerConnection.createOffer().then(offer => {
    peerConnection.setLocalDescription(offer);
    socket.emit('offer', { room: currentRoom, offer });
  });
}

socket.on('offer', (offer) => {
  if (!peerConnection) createPeerConnection();
  peerConnection.setRemoteDescription(offer);
  peerConnection.createAnswer().then(answer => {
    peerConnection.setLocalDescription(answer);
    socket.emit('answer', { room: currentRoom, answer });
  });
});

socket.on('answer', (answer) => {
  if (peerConnection) peerConnection.setRemoteDescription(answer);
});

socket.on('ice-candidate', (candidate) => {
  if (peerConnection) peerConnection.addIceCandidate(candidate);
});

function nextUser() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  remoteVideo.srcObject = null;
  socket.emit('next');
  statusDiv.textContent = '🔍 Finding next match...';
  nextBtn.disabled = true;
}
