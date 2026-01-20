/**
 * Chat Page JavaScript
 * Handles real-time messaging using Socket.io
 */

const token = sessionStorage.getItem('token');
const username = sessionStorage.getItem('username');
const userId = sessionStorage.getItem('userId');
const roomName = sessionStorage.getItem('roomName');
let roomId = sessionStorage.getItem('roomId'); // this should already be chatId (24-char string)

// Check if user is logged in and has room info
if (!username || !userId || !token || !roomName) {
    window.location.href = '/index.html';
}

// Ensure we have a valid chatId - fetch from backend if sessionStorage has invalid value
async function ensureChatId() {
    // Check if we have a valid chatId string
    if (roomId && typeof roomId === 'string' && /^[0-9a-fA-F]{24}$/.test(roomId)) {
        return roomId;
    }

    // If invalid or missing, fetch from backend using roomName
    console.warn('Invalid chatId in sessionStorage, fetching from backend...', roomId);
    
    try {
        const response = await fetch(`/api/rooms/join/${encodeURIComponent(roomName)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();

        if (!response.ok || !result.success || !result.data || !result.data.chatId) {
            console.error('Failed to fetch chatId:', result);
            showError(result.message || 'Failed to load chat. Please go back and join again.');
            return null;
        }

        // Extract and validate chatId
        let chatId = result.data.chatId;
        if (typeof chatId !== 'string') {
            chatId = chatId.toString ? chatId.toString() : (chatId._id ? chatId._id.toString() : String(chatId));
        }

        if (!/^[0-9a-fA-F]{24}$/.test(chatId)) {
            console.error('Invalid chatId format from backend:', chatId);
            showError('Invalid chat ID format');
            return null;
        }

        // Update sessionStorage with correct chatId
        roomId = chatId;
        sessionStorage.setItem('roomId', roomId);
        console.log('ChatId resolved:', roomId);
        return roomId;
    } catch (error) {
        console.error('Error fetching chatId:', error);
        showError('Error loading chat. Please try again.');
        return null;
    }
}

// Connect socket with JWT token
const socket = io({
    auth: {
        token: token
    }
});

// Connect user to socket (user-online event)
socket.on('connect', () => {
    socket.emit('user-online');
    // Join chat using chatId from session
    ensureChatId().then((chatId) => {
        if (chatId) {
            socket.emit('join-chat', { chatId });
        }
    });
});

// Display room name
document.getElementById('roomNameDisplay').textContent = roomName;
document.getElementById('chatRoomTitle').textContent = roomName;

// Load previous messages (roomId here is actually chatId)
async function loadMessages() {
    try {
        const chatId = await ensureChatId();
        if (!chatId) {
            throw new Error('Chat ID could not be resolved');
        }

        const response = await fetch(`/api/messages/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load messages');
        }
        
        const messages = result.data.messages || [];
        
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<div class="loading">No messages yet. Start the conversation!</div>';
            return;
        }

        messages.forEach(message => {
            displayMessage(message);
        });

        // Scroll to bottom
        scrollToBottom();
    } catch (error) {
        console.error('Error loading messages:', error);
        document.getElementById('messagesContainer').innerHTML = 
            '<div class="loading">Error loading messages</div>';
    }
}

// Display a message in the chat
function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    const messageDiv = document.createElement('div');
    const senderName = message.senderName || message.senderId?.name || message.sender?.name || 'Unknown';
    const senderId = message.senderId?._id || message.senderId || message.sender?._id || message.senderId;
    const isMe = senderId && userId ? String(senderId) === String(userId) : senderName === username;
    messageDiv.className = `chat-msg ${isMe ? 'is-me' : 'is-them'}`;
    if (message._id) messageDiv.dataset.messageId = String(message._id);
    
    const dateSource = message.createdAt || message.timestamp || Date.now();
    const timestamp = new Date(dateSource).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });

    const messageText = message.text || message.content || '';
    
    const statusText = isMe ? 'Sent' : '';
    messageDiv.innerHTML = `
        <div class="chat-msg-avatar"></div>
        <div class="chat-msg-body">
            <div class="chat-msg-head">
                <span class="chat-msg-sender">${escapeHtml(senderName)}</span>
                <span class="chat-msg-time">${timestamp}</span>
            </div>
            <div class="chat-msg-text">${escapeHtml(messageText)}</div>
            ${isMe ? `<div class="chat-msg-meta"><span class="chat-msg-status" data-status-for="${message._id || ''}">${statusText}</span></div>` : ``}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

// Display notification message
function displayNotification(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-note';
    
    messageDiv.innerHTML = `
        <div class="chat-note-pill">${escapeHtml(message)}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    scrollToBottom();
}

const messageInputEl = document.getElementById('messageInput');

// Handle message form submission
document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const content = (messageInputEl?.value || '').trim();
    
    if (!content) {
        return;
    }

    // Send message via socket (needs chatId, not roomName)
    ensureChatId().then((chatId) => {
        if (chatId) {
            socket.emit('send-message', {
                chatId,
                text: content
            });
            // Clear input only after we have chatId
            if (messageInputEl) messageInputEl.value = '';
        } else {
            showError('Chat ID not found. Please go back and re-join the room.');
        }
    });
});

// Socket event handlers

// New message received
socket.on('new-message', (data) => {
    // Handle both old format (data) and new format (data.data.message)
    const message = data.data?.message || data;
    displayMessage(message);

    // If message is from someone else, immediately send "seen" ack
    const senderId = message.senderId?._id || message.senderId;
    const isMe = senderId && userId ? String(senderId) === String(userId) : false;
    if (!isMe && message._id) {
        ensureChatId().then((chatId) => {
            if (chatId) socket.emit('message-seen', { chatId, messageId: String(message._id) });
        });
    }
});

// When our message is seen, update UI
socket.on('message-seen', (data) => {
    const messageId = data?.messageId;
    if (!messageId) return;
    const statusEl = document.querySelector(`.chat-msg-status[data-status-for="${messageId}"]`);
    if (statusEl) {
        statusEl.textContent = 'Seen ✅';
        statusEl.classList.add('is-seen');
    }
});

// User joined the room
socket.on('user-joined', (data) => {
    displayNotification(data.message || `${data.username} joined the room`);
    if (!currentRoomUsers.includes(data.username)) {
        currentRoomUsers.push(data.username);
    }
    updateRoomUsers();
});

// User left the room
socket.on('user-left', (data) => {
    displayNotification(data.message || `${data.username} left the room`);
    currentRoomUsers = currentRoomUsers.filter(u => u !== data.username);
    updateRoomUsers();
});

// Room joined successfully
socket.on('room-joined', (data) => {
    currentRoomUsers = data.users || [];
    updateRoomUsers();
    loadMessages();
});

// Online users updated
socket.on('online-users-updated', async () => {
    await updateOnlineUsers();
});

// Error handler
socket.on('error', (data) => {
    showError(data.message);
});

// Update online users list
async function updateOnlineUsers() {
    try {
        const response = await fetch('/api/users/online', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load users');
        }
        
        const users = result.data.users || [];
        
        const onlineUsersList = document.getElementById('onlineUsersList');
        onlineUsersList.innerHTML = '';

        if (users.length === 0) {
            onlineUsersList.innerHTML = '<div class="chat-user-empty">No users online</div>';
            return;
        }

        users.forEach(user => {
            const userName = user.name || user.email;
            const div = document.createElement('div');
            div.className = `chat-user ${userName === username ? 'is-me' : ''}`;
            div.dataset.userId = user.id || user._id || '';
            div.dataset.userName = userName;
            div.dataset.userEmail = user.email || '';
            div.innerHTML = `
                <div class="chat-user-avatar"></div>
                <div class="chat-user-meta">
                    <div class="chat-user-name">${escapeHtml(userName)}${userName === username ? ' (You)' : ''}</div>
                    <div class="chat-user-status">Online</div>
                </div>
            `;
            if (userName !== username && typeof openUserProfile === 'function') {
                div.addEventListener('click', () => openUserProfile({
                    id: div.dataset.userId,
                    name: div.dataset.userName,
                    email: div.dataset.userEmail || ''
                }));
            }
            onlineUsersList.appendChild(div);
        });
    } catch (error) {
        console.error('Error updating online users:', error);
    }
}

// Store room users
let currentRoomUsers = [];

// Update room users list
function updateRoomUsers() {
    const roomUsersList = document.getElementById('roomUsersList');
    roomUsersList.innerHTML = '';
    
    if (currentRoomUsers.length === 0) {
        roomUsersList.innerHTML = '<div class="chat-user-empty">No users in room</div>';
        return;
    }
    
    currentRoomUsers.forEach(user => {
        const div = document.createElement('div');
        div.className = `chat-user ${user === username ? 'is-me' : ''}`;
        div.innerHTML = `
            <div class="chat-user-avatar"></div>
            <div class="chat-user-meta">
                <div class="chat-user-name">${escapeHtml(user)}${user === username ? ' (You)' : ''}</div>
                <div class="chat-user-status">In room</div>
            </div>
        `;
        if (user !== username && typeof openUserProfile === 'function') {
            div.addEventListener('click', () => openUserProfile({
                id: '',
                name: user,
                email: ''
            }));
        }
        roomUsersList.appendChild(div);
    });
}

// Leave room button
document.getElementById('leaveRoomBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to leave this room?')) {
        socket.disconnect();
        sessionStorage.removeItem('roomName');
        sessionStorage.removeItem('roomId');
        window.location.href = '/options.html';
    }
});

// Load initial data
loadMessages();
updateOnlineUsers();

// Scroll to bottom of messages
function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

// Handle page visibility - reconnect if needed
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !socket.connected) {
        socket.connect();
        socket.on('connect', () => {
            socket.emit('user-online');
            if (roomId) {
                socket.emit('join-chat', { chatId: roomId });
            }
        });
    }
});

// ------------- User profile modal + DM + voice input -------------
const userProfileModal = document.getElementById('userProfileModal');
const userProfileClose = document.getElementById('userProfileClose');
const profileNameEl = document.getElementById('userProfileTitle');
const profileEmailEl = document.getElementById('userProfileEmail');
const addFriendBtn = document.getElementById('addFriendBtn');
const startDmBtn = document.getElementById('startDmBtn');
const userDmForm = document.getElementById('userDmForm');
const userDmInput = document.getElementById('userDmInput');
const userDmMic = document.getElementById('userDmMic');
const userProfileError = document.getElementById('userProfileError');
const mainMicBtn = document.getElementById('mainMicBtn');

let currentProfileUser = null;

function openUserProfile(user) {
    currentProfileUser = user;
    if (profileNameEl) profileNameEl.textContent = user.name || 'User';
    if (profileEmailEl) profileEmailEl.textContent = user.email || '';

    const friends = JSON.parse(localStorage.getItem('friends') || '[]');
    const key = user.name || user.id;
    const isFriend = key && friends.includes(key);
    if (addFriendBtn) {
        addFriendBtn.textContent = isFriend ? 'Friend ✓' : 'Add Friend';
        addFriendBtn.dataset.added = isFriend ? 'true' : 'false';
    }

    if (userProfileModal) {
        userProfileModal.classList.remove('is-hidden');
        userProfileModal.setAttribute('aria-hidden', 'false');
    }
}

function closeUserProfile() {
    if (userProfileModal) {
        userProfileModal.classList.add('is-hidden');
        userProfileModal.setAttribute('aria-hidden', 'true');
    }
    currentProfileUser = null;
    if (userProfileError) userProfileError.classList.remove('show');
}

if (userProfileClose) {
    userProfileClose.addEventListener('click', closeUserProfile);
}
if (userProfileModal) {
    userProfileModal.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('user-modal__backdrop')) {
            closeUserProfile();
        }
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && userProfileModal && !userProfileModal.classList.contains('is-hidden')) {
        closeUserProfile();
    }
});

if (addFriendBtn) {
    addFriendBtn.addEventListener('click', () => {
        if (!currentProfileUser) return;
        const key = currentProfileUser.name || currentProfileUser.id;
        if (!key) return;
        let friends = JSON.parse(localStorage.getItem('friends') || '[]');
        const added = addFriendBtn.dataset.added === 'true';
        if (added) {
            friends = friends.filter(f => f !== key);
            addFriendBtn.textContent = 'Add Friend';
            addFriendBtn.dataset.added = 'false';
        } else {
            if (!friends.includes(key)) friends.push(key);
            addFriendBtn.textContent = 'Friend ✓';
            addFriendBtn.dataset.added = 'true';
        }
        localStorage.setItem('friends', JSON.stringify(friends));
    });
}

function sendDmToCurrentUser(text) {
    if (!currentProfileUser) return;
    const targetUsername = currentProfileUser.name || currentProfileUser.email;
    if (!targetUsername) return;
    socket.emit('private-chat', { userId, username, targetUsername });
    // actual text messages will be sent in the private room chat
}

if (startDmBtn) {
    startDmBtn.addEventListener('click', () => {
        sendDmToCurrentUser('');
        closeUserProfile();
    });
}

if (userDmForm) {
    userDmForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = (userDmInput?.value || '').trim();
        if (!text) return;
        sendDmToCurrentUser(text);
        if (userDmInput) userDmInput.value = '';
        closeUserProfile();
    });
}

// Voice input with Web Speech API
let recognition = null;
let speechTargetInput = null;
if (typeof window !== 'undefined') {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
        recognition = new SR();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.addEventListener('result', (event) => {
            const transcript = Array.from(event.results).map(r => r[0].transcript).join(' ');
            const target = speechTargetInput || userDmInput || messageInputEl;
            if (target) {
                target.value = (target.value + ' ' + transcript).trim();
            }
        });
        recognition.addEventListener('end', () => {
            if (userDmMic) userDmMic.classList.remove('is-recording');
            if (mainMicBtn) mainMicBtn.classList.remove('is-recording');
            speechTargetInput = null;
        });
    }
}

if (userDmMic) {
    userDmMic.addEventListener('click', () => {
        if (!recognition) {
            if (userProfileError) {
                userProfileError.textContent = 'Voice input not supported in this browser.';
                userProfileError.classList.add('show');
            }
            return;
        }
        try {
            speechTargetInput = userDmInput || null;
            recognition.start();
            if (userDmMic) userDmMic.classList.add('is-recording');
        } catch (err) {
            console.error('Speech recognition error', err);
        }
    });
}

if (mainMicBtn) {
    mainMicBtn.addEventListener('click', () => {
        if (!recognition) {
            showError('Voice input not supported in this browser.');
            return;
        }
        try {
            speechTargetInput = messageInputEl || null;
            recognition.start();
            mainMicBtn.classList.add('is-recording');
        } catch (err) {
            console.error('Speech recognition error', err);
        }
    });
}
