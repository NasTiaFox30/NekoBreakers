import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

const socket = io(window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : `http://${window.location.hostname}:3000`
);

function App() {
  const [user, setUser] = useState(null);

  // Перевірка сесії при завантаженні
  useEffect(() => {
    const savedSession = localStorage.getItem('neko_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      setUser(sessionData);
      socket.emit('join_room', sessionData); // Автовхід
    }
  }, []);

  const handleJoin = (data) => {
    setUser(data);
    localStorage.setItem('neko_session', JSON.stringify(data));
    socket.emit('join_room', data);
  };

  const handleLogout = () => {
    localStorage.removeItem('neko_session');
    setUser(null);
    window.location.reload(); // Чистий вихід
  };

  return (
    <div className="app-container">
      {!user ? (
        <Lobby onJoin={handleJoin} />
      ) : (
        <GameBoard socket={socket} user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;