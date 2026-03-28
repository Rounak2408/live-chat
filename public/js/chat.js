/**
 * Chat Page JavaScript
 * Handles real-time messaging using Socket.io
 */

const API_BASE = typeof window.API_BASE === 'string' ? window.API_BASE : '';

const token = sessionStorage.getItem('token');
const username = sessionStorage.getItem('username');
const userId = sessionStorage.getItem('userId');
const roomName = sessionStorage.getItem('roomName');
let roomId = sessionStorage.getItem('roomId'); // this should already be chatId (24-char string)

// Check if user is logged in and has room info
if (!username || !userId || !token || !roomName) {
    window.location.href = '/index.html';
}

// Clean up invalid roomId from sessionStorage if it's an object (stored incorrectly)
if (roomId) {
    try {
        // Try to parse as JSON (if it was stored as object string)
        const parsed = JSON.parse(roomId);
        if (typeof parsed === 'object' && parsed._id) {
            console.warn('Found object in sessionStorage, cleaning up...');
            sessionStorage.removeItem('roomId');
            roomId = null;
        }
    } catch (e) {
        // Not JSON, check if it's a valid string ID
        if (typeof roomId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(roomId)) {
            console.warn('Invalid roomId format in sessionStorage, will fetch fresh');
            sessionStorage.removeItem('roomId');
            roomId = null;
        }
    }
}

// Helper function to extract string ID from various formats
function extractStringId(value) {
    if (!value) return null;
    
    // If already a valid string ID
    if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        return value;
    }
    
    // If it's an object, try to extract _id
    if (typeof value === 'object') {
        // Try _id first
        if (value._id) {
            const id = typeof value._id === 'string' ? value._id : 
                      (value._id.toString ? value._id.toString() : String(value._id));
            if (/^[0-9a-fA-F]{24}$/.test(id)) {
                return id;
            }
        }
        // Try direct toString
        if (value.toString) {
            const id = value.toString();
            if (/^[0-9a-fA-F]{24}$/.test(id)) {
                return id;
            }
        }
    }
    
    // Try converting to string
    const strId = String(value);
    if (/^[0-9a-fA-F]{24}$/.test(strId)) {
        return strId;
    }
    
    return null;
}

// Ensure we have a valid chatId - fetch from backend if sessionStorage has invalid value
async function ensureChatId() {
    // Try to extract valid ID from sessionStorage first
    const extractedId = extractStringId(roomId);
    if (extractedId) {
        return extractedId;
    }

    // If invalid or missing, fetch from backend using roomName
    console.warn('Invalid chatId in sessionStorage, fetching from backend...', roomId);
    
    try {
        const response = await fetch(`${API_BASE}/api/rooms/join/${encodeURIComponent(roomName)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();

        if (!response.ok || !result.success || !result.data) {
            console.error('Failed to fetch chatId:', result);
            showError(result.message || 'Failed to load chat. Please go back and join again.');
            return null;
        }

        // Extract chatId from response - could be in result.data.chatId or result.data.room.chatId
        let chatIdObj = result.data.chatId || result.data.room?.chatId;
        
        if (!chatIdObj) {
            console.error('No chatId in response:', result.data);
            showError('Chat ID not found in response. Please rejoin the room.');
            return null;
        }

        // Extract string ID using helper function
        const chatId = extractStringId(chatIdObj);
        
        if (!chatId) {
            console.error('Could not extract valid chatId from:', chatIdObj);
            showError('Invalid chat ID format. Please rejoin the room.');
            return null;
        }

        // Update sessionStorage with correct chatId (string only)
        roomId = chatId;
        sessionStorage.setItem('roomId', chatId);
        console.log('✅ ChatId resolved and saved:', chatId);
        return chatId;
    } catch (error) {
        console.error('Error fetching chatId:', error);
        showError('Error loading chat. Please try again.');
        return null;
    }
}

// Connect socket to same host as API (required when frontend is on Netlify, API on Render)
const socketOptions = {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
};
const socket = API_BASE ? io(API_BASE, socketOptions) : io(socketOptions);

// Connect user to socket (user-online event)
socket.on('connect', () => {
    console.log('✅ Socket connected, ID:', socket.id);
    socket.emit('user-online');
    // Join chat using chatId from session
    ensureChatId().then((chatId) => {
        if (chatId) {
            socket.emit('join-chat', { chatId });
            console.log('Joined chat:', chatId);
            // Verify join was successful
            socket.once('room-joined', () => {
                console.log('✅ Successfully joined chat room');
            });
        } else {
            console.error('❌ Could not get chatId to join');
        }
    });
});

socket.on('disconnect', () => {
    console.warn('❌ Socket disconnected');
    showError('Connection lost. Please refresh the page.');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showError('Failed to connect to server. Please check your connection.');
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

        const response = await fetch(`${API_BASE}/api/messages/${chatId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            const errorMsg = result.message || 'Failed to load messages';
            console.error('Messages API Error:', errorMsg, result);
            
            // Show specific error message
            const messagesContainer = document.getElementById('messagesContainer');
            if (response.status === 404) {
                messagesContainer.innerHTML = '<div class="loading" style="color: #f04747;">Chat not found. Please go back and join the room again.</div>';
            } else if (response.status === 403) {
                messagesContainer.innerHTML = '<div class="loading" style="color: #f04747;">You do not have access to this chat. Please rejoin the room.</div>';
            } else if (response.status === 401) {
                messagesContainer.innerHTML = '<div class="loading" style="color: #f04747;">Session expired. Please login again.</div>';
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
            } else {
                messagesContainer.innerHTML = `<div class="loading" style="color: #f04747;">${errorMsg}</div>`;
            }
            return;
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
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.innerHTML = 
                '<div class="loading" style="color: #f04747;">Error loading messages. Please refresh the page.</div>';
        }
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
    if (message._id) {
        messageDiv.dataset.messageId = String(message._id);
        // Store timeout ID if it's an optimistic message
        if (message._timeoutId) {
            messageDiv.dataset.timeoutId = message._timeoutId;
        }
    }
    
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
document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const content = (messageInputEl?.value || '').trim();
    
    if (!content) {
        return;
    }

    // Check if socket is connected
    if (!socket || !socket.connected) {
        showError('Not connected to server. Please refresh the page.');
        console.error('Socket not connected');
        return;
    }

    try {
        // Get chatId
        const chatId = await ensureChatId();
        
        if (!chatId) {
            showError('Chat ID not found. Please go back and re-join the room.');
            return;
        }

        console.log('Sending message:', { chatId, content, socketConnected: socket.connected });

        // Create optimistic message (show immediately)
        const tempMessageId = 'temp-' + Date.now();
        const tempMessage = {
            _id: tempMessageId,
            text: content,
            senderId: { _id: userId, name: username },
            createdAt: new Date(),
            isOptimistic: true
        };
        displayMessage(tempMessage);

        // Clear input immediately for better UX
        if (messageInputEl) messageInputEl.value = '';

        // Send message via socket
        console.log('Emitting send-message:', { chatId, text: content, socketId: socket.id });
        
        // Set timeout to remove optimistic message if not confirmed within 5 seconds
        const optimisticTimeout = setTimeout(() => {
            const optimisticMsg = document.querySelector(`[data-message-id="${tempMessageId}"]`);
            if (optimisticMsg) {
                console.warn('Optimistic message not confirmed, removing...');
                optimisticMsg.remove();
                showError('Message may not have been sent. Please try again.');
            }
        }, 5000);
        
        // Store timeout ID to clear if message is confirmed
        tempMessage._timeoutId = optimisticTimeout;
        
        socket.emit('send-message', {
            chatId,
            text: content
        });
        
        console.log('✅ Message emit completed');
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message. Please try again.');
        // Remove optimistic message on error
        const optimisticMsg = document.querySelector(`[data-message-id^="temp-"]`);
        if (optimisticMsg) optimisticMsg.remove();
    }
});

// Socket event handlers

// New message received
socket.on('new-message', (data) => {
    // Handle both old format (data) and new format (data.data.message)
    const message = data.data?.message || data;
    
    console.log('📨 New message received:', message);
    
    // Remove optimistic message if this is the confirmed version
    if (message._id && !message._id.startsWith('temp-')) {
        // Find and remove all optimistic messages
        const optimisticMsgs = document.querySelectorAll(`[data-message-id^="temp-"]`);
        optimisticMsgs.forEach(msg => {
            const timeoutId = msg.dataset.timeoutId;
            if (timeoutId) clearTimeout(parseInt(timeoutId));
            msg.remove();
        });
    }
    
    // Don't show duplicate messages (if optimistic already shown)
    const existingMsg = document.querySelector(`[data-message-id="${message._id}"]`);
    if (!existingMsg || message._id.startsWith('temp-')) {
        displayMessage(message);
    }

    // If message is from someone else, immediately send "seen" ack
    const senderId = message.senderId?._id || message.senderId;
    const isMe = senderId && userId ? String(senderId) === String(userId) : false;
    if (!isMe && message._id && !message._id.startsWith('temp-')) {
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
    const errorMsg = data?.message || 'An error occurred';
    console.error('Socket error:', errorMsg, data);
    showError(errorMsg);
    
    // If error is about not being a participant, suggest rejoining
    if (errorMsg.includes('not a member') || errorMsg.includes('not a participant')) {
        setTimeout(() => {
            if (confirm('You need to rejoin the room. Go back and join again?')) {
                window.location.href = '/options.html';
            }
        }, 2000);
    }
});


// Update online users list
async function updateOnlineUsers() {
    try {
        const response = await fetch(`${API_BASE}/api/users/online`, {
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
