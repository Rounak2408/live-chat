# Real-Time Chat Application

A complete college-level real-time chat application built with Node.js, Express.js, Socket.io, and MongoDB. This application supports group chat rooms, private one-to-one messaging, and real-time communication.

## 🚀 Features

- **User Authentication**: Username and Email/Phone registration with dummy OTP verification
- **Group Chat Rooms**: Create or join group chat rooms
- **Private Chat**: One-to-one messaging with online users
- **Real-Time Communication**: Instant message delivery using Socket.io
- **Online Users**: See who's online and available for chat
- **Message History**: All messages are stored in MongoDB
- **Modern UI**: Clean, responsive design with smooth animations

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** (comes with Node.js) or **yarn**

## 🛠️ Installation & Setup

### Step 1: Clone or Download the Project

Navigate to the project directory:
```bash
cd "live chat"
```

### Step 2: Install Dependencies

Install all required npm packages:
```bash
npm install
```

This will install:
- express
- socket.io
- mongoose
- cors
- nodemon (for development)

### Step 3: Start MongoDB

Make sure MongoDB is running on your system:

**Windows:**
```bash
# If MongoDB is installed as a service, it should start automatically
# Or start it manually:
mongod
```

**macOS/Linux:**
```bash
# Start MongoDB service
sudo systemctl start mongod
# Or
mongod
```

**Note:** MongoDB should be running on `mongodb://localhost:27017` (default port)

### Step 4: Configure MongoDB Connection (Optional)

The application uses MongoDB at `mongodb://localhost:27017/realtime-chat` by default.

To change the connection string, create a `.env` file in the root directory:
```
MONGODB_URI=mongodb://localhost:27017/realtime-chat
PORT=3000
```

### Step 5: Start the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

### Step 6: Access the Application

Open your web browser and navigate to:
```
http://localhost:3000
```

## 📁 Project Structure

```
live chat/
├── server/
│   ├── models/
│   │   ├── User.js          # User schema (username, email/phone, verification)
│   │   ├── Room.js          # Room schema (group/private rooms)
│   │   └── Message.js       # Message schema (sender, content, timestamp)
│   ├── server.js            # Express server setup
│   └── socketHandlers.js    # Socket.io event handlers
├── public/
│   ├── index.html           # Home page (registration + OTP)
│   ├── options.html         # Chat options page
│   ├── chat.html            # Chat interface
│   ├── css/
│   │   └── style.css        # All styling
│   └── js/
│       ├── home.js          # Home page logic
│       ├── options.js       # Options page logic
│       └── chat.js          # Chat page logic
├── package.json
└── README.md
```

## 🎯 How to Use

### 1. Registration & OTP Verification

1. Open `http://localhost:3000` in your browser
2. Enter a unique username
3. Choose Email or Phone and enter your contact information
4. Click "Get OTP"
5. A dummy OTP will be displayed on screen (4-6 digits)
6. Enter the OTP and click "Verify & Continue"

**Note:** This is a dummy OTP system for demonstration. In production, you would send OTP via SMS or email.

### 2. Choose Chat Option

After verification, you'll see three options:

**A. Join Room**
- Enter an existing room name
- Click "Join" to enter the group chat

**B. Create Room**
- Enter a new room name
- Click "Create & Join" to create and enter the room

**C. Personal Chat**
- Select an online user from the list
- Start a private one-to-one conversation

### 3. Chatting

- Type your message in the input box
- Press Enter or click "Send"
- Messages appear in real-time for all users in the room
- See online users and room participants in the sidebar
- Click "Leave Room" to exit and return to options

## 🔌 Socket.io Events

### Client → Server Events

- `user-connected`: User connects to socket
- `join-room`: User joins an existing room
- `create-room`: User creates a new room
- `private-chat`: User initiates private chat
- `send-message`: User sends a message

### Server → Client Events

- `online-users-updated`: Online users list updated
- `room-joined`: Successfully joined a room
- `room-created`: Successfully created a room
- `user-joined`: Another user joined the room
- `user-left`: A user left the room
- `new-message`: New message received
- `error`: Error occurred

## 🗄️ Database Schema

### User Collection
```javascript
{
  username: String (unique, required),
  email: String (optional),
  phone: String (optional),
  verified: Boolean (default: false),
  socketId: String,
  isOnline: Boolean (default: false),
  createdAt: Date
}
```

### Room Collection
```javascript
{
  name: String (required),
  type: String (enum: ['group', 'private']),
  createdBy: ObjectId (ref: User),
  participants: [ObjectId] (ref: User),
  createdAt: Date
}
```

### Message Collection
```javascript
{
  sender: ObjectId (ref: User),
  senderName: String,
  room: ObjectId (ref: Room),
  roomName: String,
  content: String (required),
  timestamp: Date
}
```

## 🧪 Testing Multi-User Functionality

To test the application with multiple users:

1. Open `http://localhost:3000` in multiple browser windows/tabs
2. Register different users in each window
3. Create or join rooms from different windows
4. Send messages and see them appear in real-time across all windows

## 🐛 Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running: `mongod` or check MongoDB service
- Verify MongoDB is on default port 27017
- Check connection string in `server.js`

### Port Already in Use
- Change the PORT in `server.js` or use environment variable
- Kill the process using the port: `netstat -ano | findstr :3000` (Windows)

### Socket.io Connection Failed
- Ensure the server is running
- Check browser console for errors
- Verify Socket.io client script is loaded

### OTP Not Displaying
- Check browser console for JavaScript errors
- Ensure all JavaScript files are loaded correctly

## 📝 Code Explanation

### Backend Architecture

**server.js:**
- Sets up Express server
- Connects to MongoDB using Mongoose
- Configures Socket.io
- Defines REST API endpoints
- Serves static files

**socketHandlers.js:**
- Handles all Socket.io events
- Manages user connections/disconnections
- Handles room joining/leaving
- Broadcasts messages to room participants
- Updates online user lists

**Models:**
- **User.js**: User schema with validation
- **Room.js**: Room schema with type (group/private)
- **Message.js**: Message schema with timestamps

### Frontend Architecture

**home.js:**
- Handles user registration form
- Validates email/phone format
- Generates and verifies dummy OTP
- Creates user account via API

**options.js:**
- Displays chat options
- Handles room joining/creation
- Lists online users for private chat
- Connects to Socket.io

**chat.js:**
- Manages real-time messaging
- Displays messages and notifications
- Updates online/room users lists
- Handles message sending/receiving

## 🎓 Academic Features

This project is designed for college-level submission and includes:

- ✅ Clean, commented code
- ✅ Proper folder structure
- ✅ RESTful API endpoints
- ✅ Real-time communication
- ✅ Database integration
- ✅ Error handling
- ✅ Responsive design
- ✅ Multi-user support

## 📚 Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Styling**: Custom CSS with modern design

## 🔒 Security Notes

This is a demonstration project. For production use, consider:

- Implementing real OTP verification via SMS/Email
- Adding authentication tokens (JWT)
- Input sanitization and validation
- Rate limiting
- HTTPS encryption
- User session management

## 📄 License

This project is created for educational purposes.

## 👨‍💻 Author

Created for college-level project submission.

## 🙏 Acknowledgments

- Socket.io for real-time communication
- MongoDB for database storage
- Express.js for server framework

---

**Happy Chatting! 💬**
