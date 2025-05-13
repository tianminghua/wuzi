import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import './App.css';
import NameDialog from './components/NameDialog';

interface CellUpdate {
  row: number;
  col: number;
  value: boolean;
  color: string;
}

interface User {
  name: string;
  isPlayer: boolean;
  color: string | null;
}

function App() {
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [board, setBoard] = useState<{ value: boolean; color: string | null }[][]>(
    Array(15).fill(null).map(() => Array(15).fill({ value: false, color: null }))
  );
  const [userName, setUserName] = useState<string>('');
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  const [isPlayer, setIsPlayer] = useState<boolean>(false);
  const [playerColor, setPlayerColor] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string>('black');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!userName) return;

    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.emit('userJoined', userName);

    // Listen for turn updates
    newSocket.on('turnUpdate', (turn: string) => {
      setCurrentTurn(turn);
    });

    // Listen for initial board state
    newSocket.on('boardState', (initialBoard: boolean[][]) => {
      setBoard(initialBoard.map(row => row.map(value => ({ value, color: null }))));
    });

    // Listen for cell updates from other users
    newSocket.on('cellUpdate', ({ row, col, value, color }: CellUpdate) => {
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map(row => [...row]);
        newBoard[row][col] = { value, color };
        return newBoard;
      });
    });

    // Listen for board clear events
    newSocket.on('boardClear', () => {
      setBoard(Array(15).fill(null).map(() => 
        Array(15).fill({ value: false, color: null })
      ));
    });

    // Listen for connected users updates
    newSocket.on('userList', (users: User[]) => {
      setConnectedUsers(users);
    });

    // Listen for player status updates
    newSocket.on('playerStatus', ({ isPlayer, color }) => {
      setIsPlayer(isPlayer);
      setPlayerColor(color);
    });

    // Listen for game over
    newSocket.on('gameOver', ({ winner }) => {
      setGameOver(true);
      setWinner(winner);
      alert(`Game Over! ${winner} player wins!`);
    });

    return () => {
      newSocket.close();
    };
  }, [userName]);

  const handleCellClick = (row: number, col: number) => {
    if (!socket || !isPlayer || gameOver) return;

    // Check if both black and white players are present
    const hasBlackPlayer = connectedUsers.some(user => user.isPlayer && user.color === 'black');
    const hasWhitePlayer = connectedUsers.some(user => user.isPlayer && user.color === 'white');
    
    if (!hasBlackPlayer || !hasWhitePlayer) {
      alert('Waiting for both players to join before starting the game.');
      return;
    }

    // Check if it's the current player's turn
    if (playerColor !== currentTurn) {
      alert(`It's ${currentTurn}'s turn. Please wait for your turn.`);
      return;
    }

    const newValue = !board[row][col].value;
    const newBoard = board.map(row => [...row]);
    newBoard[row][col] = { value: newValue, color: playerColor };
    setBoard(newBoard);

    // Emit the update to other users
    socket.emit('cellUpdate', { row, col, value: newValue });
    
    // Switch turns after a move
    const nextTurn = currentTurn === 'black' ? 'white' : 'black';
    socket.emit('turnUpdate', nextTurn);
  };

  const clearBoard = () => {
    if (!socket || !isPlayer) return;
    
    setGameOver(false);
    setWinner(null);
    // Reset the board state
    setBoard(Array(15).fill(null).map(() => 
      Array(15).fill({ value: false, color: null })
    ));
    
    // Notify other users
    socket.emit('boardClear');
  };

  // Create a 15x15 grid
  const renderBoard = () => {
    return board.map((row, i) => (
      <div key={i} className="board-row">
        {row.map((cell, j) => (
          <div 
            key={`${i}-${j}`} 
            className={`board-cell ${!isPlayer ? 'view-only' : ''}`}
            onClick={() => handleCellClick(i, j)}
          >
            <div 
              className={`cell-content ${cell.value ? 'filled' : ''}`}
              style={cell.value ? { backgroundColor: cell.color || 'black' } : undefined}
            ></div>
          </div>
        ))}
      </div>
    ));
  };

  if (!userName) {
    return <NameDialog onSubmit={setUserName} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <nav className="navbar">
          <div className="logo">YourBrand</div>
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h1>Welcome to Your Brand</h1>
            <p>Transform your ideas into reality with our innovative solutions</p>
            <button className="cta-button">Get Started</button>
          </div>
        </section>

        <section className="board-section">
          <div className="board-container">
            <div className="user-sidebar">
              <div className="user-info">
                <h3>Your Name</h3>
                <div className="user-name">
                  {userName}
                  {isPlayer ? ` (${playerColor} player)` : ' (Viewer)'}
                </div>
              </div>
              <div className="connected-users">
                <h3>Connected Users</h3>
                <div className="connected-users-list">
                  {connectedUsers.map((user, index) => (
                    <span key={index}>
                      {user.name} {user.isPlayer ? `(${user.color} player)` : '(Viewer)'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="board-game">
              <div className="board-header">
                {(() => {
                  const hasBlackPlayer = connectedUsers.some(user => user.isPlayer && user.color === 'black');
                  const hasWhitePlayer = connectedUsers.some(user => user.isPlayer && user.color === 'white');
                  
                  if (!hasBlackPlayer || !hasWhitePlayer) {
                    return <div className="status-message">Waiting for more players to join.</div>;
                  }
                  
                  return (
                    <div className="status-message">
                      {currentTurn === 'black' ? 'Black player to drop a Go piece' : 'White player to drop a Go piece'}
                    </div>
                  );
                })()}
                <button 
                  className="clear-button" 
                  onClick={clearBoard}
                  disabled={!isPlayer}
                >
                  Start Over
                </button>
              </div>
              {renderBoard()}
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <h2>Our Features</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Innovation</h3>
              <p>Cutting-edge solutions for modern problems</p>
            </div>
            <div className="feature-card">
              <h3>Reliability</h3>
              <p>Trusted by thousands of satisfied customers</p>
            </div>
            <div className="feature-card">
              <h3>Support</h3>
              <p>24/7 dedicated customer support</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <p>&copy; 2024 Your Brand. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App; 