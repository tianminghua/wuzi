const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Add win check function
function checkWin(board, row, col, color) {
  // Check horizontal
  let count = 0;
  // Check left
  for (let i = col; i >= 0; i--) {
    if (board[row][i] && board[row][i].color === color) {
      count++;
    } else {
      break;
    }
  }
  // Check right
  for (let i = col + 1; i < 15; i++) {
    if (board[row][i] && board[row][i].color === color) {
      count++;
    } else {
      break;
    }
  }
  if (count >= 5) return true;

  // Check vertical
  count = 0;
  // Check up
  for (let i = row; i >= 0; i--) {
    if (board[i][col] && board[i][col].color === color) {
      count++;
    } else {
      break;
    }
  }
  // Check down
  for (let i = row + 1; i < 15; i++) {
    if (board[i][col] && board[i][col].color === color) {
      count++;
    } else {
      break;
    }
  }
  if (count >= 5) return true;

  // Check diagonal (top-left to bottom-right)
  count = 0;
  // Check top-left
  for (let i = 0; i < 5; i++) {
    const r = row - i;
    const c = col - i;
    if (r >= 0 && c >= 0 && board[r][c] && board[r][c].color === color) {
      count++;
    } else {
      break;
    }
  }
  // Check bottom-right
  for (let i = 1; i < 5; i++) {
    const r = row + i;
    const c = col + i;
    if (r < 15 && c < 15 && board[r][c] && board[r][c].color === color) {
      count++;
    } else {
      break;
    }
  }
  if (count >= 5) return true;

  // Check diagonal (top-right to bottom-left)
  count = 0;
  // Check top-right
  for (let i = 0; i < 5; i++) {
    const r = row - i;
    const c = col + i;
    if (r >= 0 && c < 15 && board[r][c] && board[r][c].color === color) {
      count++;
    } else {
      break;
    }
  }
  // Check bottom-left
  for (let i = 1; i < 5; i++) {
    const r = row + i;
    const c = col - i;
    if (r < 15 && c >= 0 && board[r][c] && board[r][c].color === color) {
      count++;
    } else {
      break;
    }
  }
  if (count >= 5) return true;

  return false;
}

// Update board state to store color information
let boardState = Array(15).fill(null).map(() => 
  Array(15).fill(null).map(() => ({ value: false, color: null }))
);
// Store connected users and their roles
let connectedUsers = new Map();
let activePlayers = new Set();
// Store player colors
let playerColors = new Map();
let currentTurn = 'black'; // Add current turn state

io.on('connection', (socket) => {
  console.log('A user connected');

  // Send current board state to new user
  socket.emit('boardState', boardState);

  // Handle user joining
  socket.on('userJoined', (userName) => {
    const isPlayer = activePlayers.size < 2;
    let playerColor = null;

    if (isPlayer) {
      // If there's only one player, they should be black
      if (activePlayers.size === 0) {
        playerColor = 'black';
      } else {
        // For the second player, check if the first player is white
        const firstPlayerId = Array.from(activePlayers)[0];
        const firstPlayerColor = playerColors.get(firstPlayerId);
        
        if (firstPlayerColor === 'white') {
          // Swap colors - make first player black and new player white
          playerColors.set(firstPlayerId, 'black');
          playerColor = 'white';
          // Update the first player's color in connectedUsers
          const firstPlayer = connectedUsers.get(firstPlayerId);
          connectedUsers.set(firstPlayerId, { ...firstPlayer, color: 'black' });
          // Notify the first player of their color change
          io.to(firstPlayerId).emit('playerStatus', { isPlayer: true, color: 'black' });
        } else {
          playerColor = 'white';
        }
        
        // Clear the board when second player joins
        boardState = Array(15).fill(null).map(() => 
          Array(15).fill(null).map(() => ({ value: false, color: null }))
        );
        currentTurn = 'black';
        io.emit('boardClear');
        io.emit('turnUpdate', currentTurn);
      }
      activePlayers.add(socket.id);
      playerColors.set(socket.id, playerColor);
    }

    connectedUsers.set(socket.id, {
      name: userName,
      isPlayer,
      color: playerColor
    });

    // Send player status to the new user
    socket.emit('playerStatus', {
      isPlayer,
      color: playerColor
    });

    // Broadcast updated user list to all clients
    io.emit('userList', Array.from(connectedUsers.values()).map(user => ({
      name: user.name,
      isPlayer: user.isPlayer,
      color: user.color
    })));

    // When a user joins, send them the current turn
    socket.emit('turnUpdate', currentTurn);
  });

  // Handle cell updates
  socket.on('cellUpdate', ({ row, col, value }) => {
    // Only allow active players to make moves
    if (activePlayers.has(socket.id)) {
      // Check if it's the player's turn
      const playerColor = playerColors.get(socket.id);
      if (playerColor !== currentTurn) {
        return; // Not this player's turn
      }

      // Update board state with color information
      boardState[row][col] = { value, color: playerColor };
      
      // Broadcast the update to all clients
      io.emit('cellUpdate', { 
        row, 
        col, 
        value,
        color: playerColor
      });

      // Check for win condition
      if (checkWin(boardState, row, col, playerColor)) {
        io.emit('gameOver', { winner: playerColor });
        return;
      }

      // Switch turns after a valid move
      currentTurn = currentTurn === 'black' ? 'white' : 'black';
      io.emit('turnUpdate', currentTurn);
    }
  });

  // Handle board clear
  socket.on('boardClear', () => {
    // Only allow active players to clear the board
    if (activePlayers.has(socket.id)) {
      // Reset the board state
      boardState = Array(15).fill(null).map(() => 
        Array(15).fill(null).map(() => ({ value: false, color: null }))
      );
      // Reset turn to black
      currentTurn = 'black';
      // Broadcast the clear event and turn reset to all clients
      io.emit('boardClear');
      io.emit('turnUpdate', currentTurn);
    }
  });

  // Handle turn updates
  socket.on('turnUpdate', (nextTurn) => {
    currentTurn = nextTurn;
    io.emit('turnUpdate', currentTurn);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
    
    // If the disconnected user was a player, remove them from active players
    if (activePlayers.has(socket.id)) {
      activePlayers.delete(socket.id);
      playerColors.delete(socket.id);
      
      // If there is exactly one player left and they are white, make them black
      if (activePlayers.size === 1) {
        const remainingPlayerId = Array.from(activePlayers)[0];
        const remainingPlayer = connectedUsers.get(remainingPlayerId);
        if (remainingPlayer.color === 'white') {
          playerColors.set(remainingPlayerId, 'black');
          connectedUsers.set(remainingPlayerId, { ...remainingPlayer, color: 'black' });
          io.to(remainingPlayerId).emit('playerStatus', { isPlayer: true, color: 'black' });
          currentTurn = 'black';
          io.emit('turnUpdate', currentTurn);
        }
      }
      
      // If there are waiting users, promote the next user to player
      const waitingUsers = Array.from(connectedUsers.entries())
        .filter(([id, user]) => !user.isPlayer && id !== socket.id);
      
      if (waitingUsers.length > 0) {
        const [nextUserId, nextUser] = waitingUsers[0];
        activePlayers.add(nextUserId);
        // Assign the color of the disconnected player
        const newColor = activePlayers.size === 1 ? 'black' : 'white';
        playerColors.set(nextUserId, newColor);
        connectedUsers.set(nextUserId, { 
          ...nextUser, 
          isPlayer: true,
          color: newColor
        });
        
        // Notify the promoted user
        io.to(nextUserId).emit('playerStatus', { 
          isPlayer: true,
          color: newColor
        });

        // Clear the board when a new player is promoted
        boardState = Array(15).fill(null).map(() => 
          Array(15).fill(null).map(() => ({ value: false, color: null }))
        );
        currentTurn = 'black';
        io.emit('boardClear');
        io.emit('turnUpdate', currentTurn);
      }
    }

    // Remove user from connected users
    connectedUsers.delete(socket.id);

    // Broadcast updated user list to all clients
    io.emit('userList', Array.from(connectedUsers.values()).map(user => ({
      name: user.name,
      isPlayer: user.isPlayer,
      color: user.color
    })));
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 