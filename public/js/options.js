/**
 * Chat Options Page JavaScript
 * Handles room joining, creation, and private chat initiation
 */

// API base URL: local = '', production = your deployed backend
const API_BASE =
  window.API_BASE ||
  ((location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? ''
    : 'https://your-backend-url.onrender.com'); // TODO: replace with your real backend URL

const token = sessionStorage.getItem('token');
const username = sessionStorage.getItem('username');
const userId = sessionStorage.getItem('userId');

// Check if user is logged in
if (!username || !userId || !token) {
    window.location.href = '/index.html';
}

// Connect socket with JWT token
const socket = io({
    auth: {
        token: token
    }
});

// Display username
document.getElementById('usernameDisplay').textContent = username;

// Connect user to socket (user-online event)
socket.on('connect', () => {
    socket.emit('user-online');
});

// Fetch and display online users
async function loadOnlineUsers() {
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
        
        if (users.length === 0) {
            onlineUsersList.innerHTML = '<div class="dm-empty">No other users online</div>';
            return;
        }

        // Filter out current user
        const otherUsers = users.filter(u => u.name !== username && u.email !== sessionStorage.getItem('email'));
        
        if (otherUsers.length === 0) {
            onlineUsersList.innerHTML = '<div class="dm-empty">No other users online</div>';
            return;
        }

        onlineUsersList.innerHTML = otherUsers.map(user => `
            <div class="dm-item" onclick="startPrivateChat('${user.name || user.email}')">
                <div class="dm-avatar"></div>
                <div class="dm-meta">
                    <div class="dm-name">${user.name || user.email}</div>
                    <div class="dm-status">Online</div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading online users:', error);
        document.getElementById('onlineUsersList').innerHTML = 
            '<div class="dm-empty">Error loading users</div>';
    }
}

// Load online users on page load
loadOnlineUsers();

// Update online users list when socket event is received
socket.on('online-users-updated', () => {
    loadOnlineUsers();
});

// Fetch and display user's rooms
async function loadUserRooms() {
    const listEl = document.getElementById('userRoomsList');
    if (!listEl) return;

    try {
        const response = await fetch(`${API_BASE}/api/rooms`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Failed to load rooms');
        }

        const rooms = result.data.rooms || [];
        listEl.innerHTML = '';

        if (rooms.length === 0) {
            listEl.innerHTML = '<div class="rooms-empty">You haven&apos;t joined any rooms yet.</div>';
            return;
        }

        rooms.forEach(room => {
            const chatIdRaw = room.chatId && (room.chatId._id || room.chatId);
            const chatId = typeof chatIdRaw === 'string' ? chatIdRaw : (chatIdRaw ? String(chatIdRaw) : '');

            const item = document.createElement('div');
            item.className = 'room-item';

            const metaEl = document.createElement('div');
            metaEl.className = 'room-item-main';
            metaEl.innerHTML = `
                <div class="room-item-name"># ${room.roomName}</div>
                <div class="room-item-meta">
                    ${room.members?.length || 1} members • ${room.adminId?.name === username ? 'Owner' : 'Member'}
                </div>
            `;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'room-item-open';
            btn.textContent = 'Open';
            btn.addEventListener('click', () => {
                if (!chatId) {
                    showError('This room is not ready yet.');
                    return;
                }
                sessionStorage.setItem('roomName', room.roomName);
                sessionStorage.setItem('roomId', chatId);
                window.location.href = '/chat.html';
            });

            item.appendChild(metaEl);
            item.appendChild(btn);
            listEl.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading rooms:', error);
        listEl.innerHTML = '<div class="rooms-empty">Error loading rooms.</div>';
    }
}

// Load rooms on page load
loadUserRooms();

// Handle Join Room form
document.getElementById('joinRoomForm').addEventListener('submit', (e) => {
    e.preventDefault();
    hideError();

    const roomName = document.getElementById('joinRoomName').value.trim();
    
    if (!roomName) {
        showError('Please enter a room name');
        return;
    }

    // Join room by name via backend and get chatId
    fetch(`${API_BASE}/api/rooms/join/${encodeURIComponent(roomName)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(res => res.json())
        .then(result => {
            if (!result.success) {
                showError(result.message || 'Failed to join room');
                return;
            }

            const { room, chatId } = result.data;
            if (!room || !chatId) {
                showError('Room or chat could not be loaded');
                return;
            }

            // Store chat/room info and go to chat page
            sessionStorage.setItem('roomName', room.roomName);
            sessionStorage.setItem('roomId', chatId);
            window.location.href = '/chat.html';
        })
        .catch(error => {
            showError('Error checking room. Please try again.');
            console.error('Error:', error);
        });
});

// Handle Create Room form
document.getElementById('createRoomForm').addEventListener('submit', (e) => {
    e.preventDefault();
    hideError();

    const roomName = document.getElementById('createRoomName').value.trim();
    
    if (!roomName) {
        showError('Please enter a room name');
        return;
    }

    // Create room via API, backend will also create chat and return chatId
    fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomName })
    })
        .then(res => res.json())
        .then(result => {
            if (!result.success) {
                showError(result.message || 'Failed to create room');
                return;
            }

            const { room, chatId } = result.data;
            sessionStorage.setItem('roomName', room.roomName);
            sessionStorage.setItem('roomId', chatId);
            window.location.href = '/chat.html';
        })
        .catch(error => {
            showError('Error creating room. Please try again.');
            console.error('Error:', error);
        });
});

// Handle Private Chat
window.startPrivateChat = function(targetUsername) {
    hideError();
    socket.emit('private-chat', { userId, username, targetUsername });
};

// Socket error handler (general)
socket.on('error', (data) => {
    if (data && data.message) {
        showError(data.message);
    }
});

// Helper functions
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

function hideError() {
    document.getElementById('errorMessage').classList.remove('show');
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = '/login.html';
    });
}

// -------- Add Friend modal & search --------
const addFriendTab = document.getElementById('addFriendTab');
const friendModal = document.getElementById('friendModal');
const friendModalClose = document.getElementById('friendModalClose');
const friendSearchInput = document.getElementById('friendSearchInput');
const friendResults = document.getElementById('friendResults');
const friendModalError = document.getElementById('friendModalError');
const tabsBurger = document.getElementById('tabsBurger');
const tabsMobileMenu = document.getElementById('tabsMobileMenu');
const pendingSection = document.getElementById('pendingSection');
const pendingListEl = document.getElementById('pendingRequestsList');
const tabOnline = document.getElementById('tabOnline');
const tabAll = document.getElementById('tabAll');
const tabPending = document.getElementById('tabPending');

let allUsersCache = null;

function openFriendModal() {
    if (friendModal) {
        friendModal.classList.remove('is-hidden');
        friendModal.setAttribute('aria-hidden', 'false');
    }
    if (friendSearchInput) {
        friendSearchInput.value = '';
        friendSearchInput.focus();
    }
    if (friendResults) {
        friendResults.innerHTML = '<div class="friend-results-empty">Type a name to search users.</div>';
    }
    if (friendModalError) {
        friendModalError.classList.remove('show');
    }
    if (!allUsersCache) {
        loadAllUsers();
    }
}

function closeFriendModal() {
    if (friendModal) {
        friendModal.classList.add('is-hidden');
        friendModal.setAttribute('aria-hidden', 'true');
    }
}

async function loadAllUsers() {
    try {
        const res = await fetch(`${API_BASE}/api/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load users');
        allUsersCache = data.data.users || [];
    } catch (err) {
        console.error('Error loading all users', err);
        if (friendModalError) {
            friendModalError.textContent = 'Failed to load users.';
            friendModalError.classList.add('show');
        }
    }
}

function renderFriendResults(query) {
    if (!friendResults) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) {
        friendResults.innerHTML = '<div class="friend-results-empty">Type a name to search users.</div>';
        return;
    }
    const list = (allUsersCache || []).filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
    if (list.length === 0) {
        friendResults.innerHTML = '<div class="friend-results-empty">No users found.</div>';
        return;
    }

    const storedFriends = JSON.parse(localStorage.getItem('friends') || '[]');

    friendResults.innerHTML = '';
    list.forEach(user => {
        const key = user.name || user.email || user.id;
        const isFriend = key && storedFriends.includes(key);
        const row = document.createElement('div');
        row.className = 'friend-result';

        const main = document.createElement('div');
        main.className = 'friend-result-main';
        main.innerHTML = `
            <div class="friend-result-name">${user.name || user.email}</div>
            <div class="friend-result-meta">${user.status || 'offline'} • ${user.email || ''}</div>
        `;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'friend-result-btn';
        btn.textContent = isFriend ? 'Added' : 'Add';
        if (isFriend) btn.classList.add('added');

        btn.addEventListener('click', async () => {
            if (btn.classList.contains('added')) return;
            try {
                const res = await fetch(`${API_BASE}/api/friends/requests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ toUserId: user.id })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    console.error('Friend request error', data.message || '');
                    return;
                }
                btn.classList.add('added');
                btn.textContent = 'Requested';
            } catch (err) {
                console.error('Friend request error', err);
            }
        });

        row.appendChild(main);
        row.appendChild(btn);
        friendResults.appendChild(row);
    });
}

if (addFriendTab) {
    addFriendTab.addEventListener('click', openFriendModal);
}
if (friendModalClose) {
    friendModalClose.addEventListener('click', closeFriendModal);
}
if (friendModal) {
    friendModal.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('friend-modal__backdrop')) {
            closeFriendModal();
        }
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && friendModal && !friendModal.classList.contains('is-hidden')) {
        closeFriendModal();
    }
});

if (friendSearchInput) {
    let debounce;
    friendSearchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            renderFriendResults(value);
        }, 200);
    });
}

// mobile tabs menu toggle
if (tabsBurger && tabsMobileMenu) {
    tabsBurger.addEventListener('click', (e) => {
        e.stopPropagation();
        tabsMobileMenu.classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
        if (!tabsMobileMenu.classList.contains('is-open')) return;
        if (!tabsMobileMenu.contains(e.target) && e.target !== tabsBurger) {
            tabsMobileMenu.classList.remove('is-open');
        }
    });

    const mobileItems = tabsMobileMenu.querySelectorAll('.tabs-mobile-item');
    mobileItems.forEach((btn) => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            if (targetId) {
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.click();
            }
            tabsMobileMenu.classList.remove('is-open');
        });
    });
}

// ---------- Pending friend requests ----------
async function loadPendingRequests() {
    if (!pendingListEl) return;

    try {
        const res = await fetch(`${API_BASE}/api/friends/requests`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load requests');

        const incoming = data.data.incoming || [];
        const outgoing = data.data.outgoing || [];

        pendingListEl.innerHTML = '';

        if (incoming.length === 0 && outgoing.length === 0) {
            pendingListEl.innerHTML = '<div class="pending-empty">You have no pending requests.</div>';
            return;
        }

        incoming.forEach((req) => {
            const user = req.fromUser;
            const row = document.createElement('div');
            row.className = 'pending-item';

            const main = document.createElement('div');
            main.className = 'pending-main';
            main.innerHTML = `
                <div class="pending-name">${user.name || user.email}</div>
                <div class="pending-meta">Incoming request</div>
            `;

            const actions = document.createElement('div');
            actions.className = 'pending-actions';

            const acceptBtn = document.createElement('button');
            acceptBtn.type = 'button';
            acceptBtn.className = 'pending-btn pending-accept';
            acceptBtn.textContent = 'Accept';
            acceptBtn.addEventListener('click', async () => {
                try {
                    await fetch(`${API_BASE}/api/friends/requests/${req._id}/accept`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    loadPendingRequests();
                } catch (err) {
                    console.error('Accept friend error', err);
                }
            });

            const rejectBtn = document.createElement('button');
            rejectBtn.type = 'button';
            rejectBtn.className = 'pending-btn pending-reject';
            rejectBtn.textContent = 'Reject';
            rejectBtn.addEventListener('click', async () => {
                try {
                    await fetch(`${API_BASE}/api/friends/requests/${req._id}/reject`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    loadPendingRequests();
                } catch (err) {
                    console.error('Reject friend error', err);
                }
            });

            actions.appendChild(acceptBtn);
            actions.appendChild(rejectBtn);

            row.appendChild(main);
            row.appendChild(actions);
            pendingListEl.appendChild(row);
        });

        outgoing.forEach((req) => {
            const user = req.toUser;
            const row = document.createElement('div');
            row.className = 'pending-item';

            const main = document.createElement('div');
            main.className = 'pending-main';
            main.innerHTML = `
                <div class="pending-name">${user.name || user.email}</div>
                <div class="pending-meta">Request sent • Pending</div>
            `;

            row.appendChild(main);
            pendingListEl.appendChild(row);
        });
    } catch (err) {
        console.error('Load pending requests error', err);
        pendingListEl.innerHTML = '<div class="pending-empty">Error loading requests.</div>';
    }
}

function showPendingSection() {
    if (pendingSection) pendingSection.classList.remove('is-hidden');
    const friendsEmpty = document.querySelector('.friends-empty');
    if (friendsEmpty) friendsEmpty.style.display = 'none';
    loadPendingRequests();
}

function hidePendingSection() {
    if (pendingSection) pendingSection.classList.add('is-hidden');
    const friendsEmpty = document.querySelector('.friends-empty');
    if (friendsEmpty) friendsEmpty.style.display = '';
}

if (tabPending) {
    tabPending.addEventListener('click', () => {
        showPendingSection();
    });
}
if (tabOnline) {
    tabOnline.addEventListener('click', () => {
        hidePendingSection();
    });
}
if (tabAll) {
    tabAll.addEventListener('click', () => {
        hidePendingSection();
    });
}
