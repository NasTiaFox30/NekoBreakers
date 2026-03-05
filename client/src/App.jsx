import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
const APP_VERSION = import.meta.env.VITE_APP_VERSION;

// const socket = io(window.location.hostname === 'localhost' 
//   ? 'http://localhost:3000' 
//   : `http://${window.location.hostname}:3000`
// );

// Додаємо пряме посилання як запасний варіант (Fallback)
const SERVER_URL = import.meta.env.VITE_APP_SERVER_URL || "https://relevant-arabela-anpurrecode-7b47cd10.koyeb.app";

const socket = io(SERVER_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5
});

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
      <div className='absolute bottom-4 right-4 text-sm text-gray-500'>
        NekoBreakers V{APP_VERSION} &copy;
      </div>
    </div>
  );
}

export default App;