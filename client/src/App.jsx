import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';

// const socket = io(window.location.hostname === 'localhost' 
//   ? 'http://localhost:3000' 
//   : `http://${window.location.hostname}:3000`
// );

// Vite використовує import.meta.env замість process.env
const socket = io(import.meta.env.VITE_APP_SERVER_URL);

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
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const userData = { ...data, isMobile };
    
    setUser(userData);
    localStorage.setItem('neko_session', JSON.stringify(userData));
    socket.emit('join_room', userData);
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