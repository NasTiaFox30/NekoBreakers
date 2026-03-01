import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar/Avatar';

const GameBoard = ({ socket, user, onLogout }) => {
    const [guess, setGuess] = useState('');
    const [attempts, setAttempts] = useState([]);
    const [players, setPlayers] = useState([]);
    const [typingPlayers, setTypingPlayers] = useState({});
    const [lastSubmiter, setLastSubmiter] = useState(null);
    const [lastSubmit, setLastSubmit] = useState(0);
    const [lastWord, setLastWord] = useState('********');
  
    // Реф для контейнера списку спроб
    const scrollRef = useRef(null);

    // Логіка автоматичного скролу при появі нового слова
    useEffect(() => {
        if (scrollRef.current) {
        // Знаходимо елемент -lastWord
        const activeElement = scrollRef.current.querySelector('.border-green-500\\/50');
        if (activeElement) {
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        }
    }, [attempts, lastWord]); // Спрацьовує, коли змінюється список або останнє слово

    useEffect(() => {
        socket.on('player_joined', (updatedPlayers) => setPlayers(updatedPlayers));
        
        socket.on('receive_history', (history) => {
        const sorted = [...history].sort((a, b) => a.rank - b.rank);
        setAttempts(sorted);
        if (history.length > 0) {
            const latest = history.reduce((prev, current) => 
            (prev.timestamp > current.timestamp) ? prev : current
            );
            setLastWord(latest.word);
        }
    });

    socket.on('receive_guess', (newAttempt) => {
        setLastWord(newAttempt.word);
        
        // Встановлюємо, хто саме вистрілив кодом
        setLastSubmiter({
        username: newAttempt.player,
        timestamp: Date.now()
        });

        setAttempts(prev => {
        const updated = [...prev, newAttempt];
        return updated.sort((a, b) => a.rank - b.rank);
        });
    });

    socket.on('display_typing', ({ id, isTyping }) => {
      setTypingPlayers(prev => ({ ...prev, [id]: isTyping }));
    });

    socket.on('game_won', ({ winner, word }) => {
      alert(`ACCESS GRANTED! Hacker ${winner} broke the code: ${word}`);
    });

    return () => {
      socket.off('player_joined');
      socket.off('receive_history');
      socket.off('display_typing');
      socket.off('receive_guess');
      socket.off('game_won');
    };
    }, [socket]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!guess.trim()) return;
        
        socket.emit('send_guess', { word: guess, player: user.username, roomId: user.roomId });
        
        // Тригер знаку оклику
        setLastSubmit(Date.now()); 
        
        setGuess('');
        socket.emit('typing', { roomId: user.roomId, isTyping: false });
    };

  const handleLeave = () => {
    if (window.confirm("Вийти з поточної сесії зламу?")) {
      socket.emit('leave_room');
      onLogout();
    }
  };

  const otherPlayers = players.filter(p => p.id !== socket.id);
  const leftSide = otherPlayers.slice(0, Math.ceil(otherPlayers.length / 2));
  const rightSide = otherPlayers.slice(Math.ceil(otherPlayers.length / 2));

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col p-6 overflow-hidden select-none">
      
        {/* HEADER */}
        <div className="border-b border-zinc-900 pb-4 mb-6 flex justify-between items-end">
            <div className="text-right text-[10px] text-zinc-500 grid justify-start uppercase tracking-widest">
                <div className="text-[10px] text-zinc-500 leading-relaxed uppercase tracking-[0.2em]">
                    Room_ID: <span className="text-white">{user.roomId}</span>
                </div>
                <button 
                    onClick={handleLeave}
                    className="text-[9px] border border-zinc-800 px-2 py-1 text-zinc-600 hover:text-red-500 hover:border-red-900 transition-colors uppercase tracking-widest"
                >
                    [ Leave ]
                </button>
            </div>

            <div className="text-3xl font-light tracking-[0.5em] flex justify-center items-center gap-6">
                <span className="text-zinc-800 font-black">[{attempts.length}]</span>
                <motion.span 
                    key={lastWord}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-zinc-200"
                >
                    {lastWord}
                </motion.span>
            </div>

            <div className="text-right text-[10px] text-zinc-500 uppercase tracking-widest">
                Players: <span className="text-white">{players.length} / 3</span>
            </div>
        </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex justify-between items-center overflow-hidden px-40">
        {/* LEFT SECTOR */}
        <div className="w-32 space-y-12">
            {leftSide.map(p => (
            <Avatar 
                key={p.id} 
                username={p.username} 
                isTyping={typingPlayers[p.id]} 
                submitted={lastSubmiter?.username === p.username ? lastSubmiter.timestamp : 0}
                isMobile={p.isMobile}
            />
            ))}
        </div>

        {/* CENTER PROCESSING UNIT */}
        <div ref={scrollRef} className="flex-1 max-w-xl h-[450px] overflow-y-auto custom-scrollbar flex flex-col gap-3 px-4 py-2 scroll-smooth">
          <AnimatePresence initial={false}>
            {attempts.map((att) => (
              <motion.div 
                layout
                key={att.timestamp}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={`bg-zinc-900/40 border p-2 font-mono relative transition-colors duration-500 ${
                  att.word === lastWord ? "border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]" : "border-zinc-800"
                }`}
              >
                <div className="flex justify-between text-[9px] uppercase tracking-widest mb-1">
                  <span className="text-zinc-500">Source: {att.player}</span>
                  <span className={att.rank <= 500 ? "text-green-400" : "text-zinc-400"}>
                    Rank: {att.rank}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold tracking-widest text-white min-w-[100px]">
                    {att.word}
                  </span>
                  <div className="flex-1 h-1.5 bg-zinc-950 border border-zinc-800 relative overflow-hidden">
                    <motion.div 
                      layout
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(5, 100 - (att.rank / 50))}%` }}
                      className={`h-full ${att.rank <= 500 ? "bg-green-500" : "bg-zinc-600"}`}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* RIGHT SECTOR */}
        <div className="w-32 space-y-12">
            {rightSide.map(p => (
            <Avatar 
                key={p.id} 
                username={p.username} 
                isTyping={typingPlayers[p.id]} 
                submitted={lastSubmiter?.username === p.username ? lastSubmiter.timestamp : 0}
                isMobile={p.isMobile}
            />
            ))}
        </div>
      </div>

      {/* 3. CONTROL DECK */}
      <div className="mt-4 w-full max-w-5xl mx-auto flex flex-col items-end pr-10">
        <Avatar 
            isMain={true} 
            username={user.username} 
            isTyping={guess.length > 0} 
            submitted={lastSubmit}
            isMobile={user.isMobile}
        />
        <div className="w-full mt-2 border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <span className="text-zinc-600 animate-pulse">{'>'}</span>
            <input
              type="text"
              autoFocus
              className="flex-1 bg-transparent outline-none uppercase text-sm tracking-widest"
              placeholder="TYPE CODE TO BREAK..."
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value);
                socket.emit('typing', { roomId: user.roomId, isTyping: e.target.value.length > 0 });
              }}
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;