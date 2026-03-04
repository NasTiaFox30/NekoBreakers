import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Avatar from './Avatar/Avatar';

const GameBoard = ({ socket, user, onLogout }) => {
    const [guess, setGuess] = useState('');
    const [archive, setArchive] = useState([]);
    const [attempts, setAttempts] = useState([]);
    const [players, setPlayers] = useState([]);
    const [typingPlayers, setTypingPlayers] = useState({});
    const [lastSubmiter, setLastSubmiter] = useState(null);
    const [lastSubmit, setLastSubmit] = useState(0);
    const [lastWord, setLastWord] = useState('********');
    const [lastHint, setLastHint] = useState(null);
    const [rejectedWord, setRejectedWord] = useState(null);
    const [isWon, setIsWon] = useState(false);
  
    // Реф для контейнера списку спроб
    const scrollRef = useRef(null);

    // Логіка автоматичного скролу
    useEffect(() => {
        if (scrollRef.current) {
            const targetWord = lastHint || lastWord;
            
            // Знаходимо всі наші блоки спроб
            const elements = scrollRef.current.querySelectorAll('.bg-zinc-900\\/40');
            
            // Шукаємо серед них той, де текст збігається з актуальним словом
            const activeElement = Array.from(elements).find(el => 
                el.textContent.includes(targetWord)
            );

            if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [attempts, lastWord, lastHint]); //При зміні списку, останнього слова, підказки


    useEffect(() => {
        socket.on('player_joined', (updatedPlayers) => setPlayers(updatedPlayers));
        
        socket.on('receive_history', (history) => {
            // Фільтруємо історію, щоб при завантаженні не показувати архівні слова (rank 0)
            const validHistory = history.filter(h => h.rank !== 0);
            const sorted = [...validHistory].sort((a, b) => a.rank - b.rank);
            setAttempts(sorted);

            if (validHistory.length > 0) {
                const latest = validHistory.reduce((prev, current) => 
                    (prev.timestamp > current.timestamp) ? prev : current
                );
                setLastWord(latest.word);
            }
        });

        socket.on('receive_guess', (newAttempt) => {
            console.log("Отримано нову спробу/підказку:", newAttempt);

            // ЛОГІКА ЧОРНОГО АРХІВУ (якщо ранг 0)
            if (newAttempt.rank === 0) {
                setRejectedWord(newAttempt.word);
                
                setTimeout(() => {
                    setArchive(prev => [newAttempt.word, ...prev].slice(0, 5)); 
                    setRejectedWord(null);
                }, 3000);
                
                return; // КРИТИЧНО: виходимо, щоб не додавати в attempts
            }

            // ЛОГІКА ГОЛОВНОГО СПИСКУ (якщо ранг > 0)
            if (newAttempt.player === "SYSTEM_DECODER") {
                setLastHint(newAttempt.word);
            } else {
                setLastWord(newAttempt.word);
                setLastHint(null);
            }
            
            // Встановлюємо, хто саме вистрілив кодом
            setLastSubmiter({
                username: newAttempt.player,
                timestamp: Date.now()
            });

            setAttempts(prev => [...prev, newAttempt].sort((a, b) => a.rank - b.rank));
        });

    socket.on('display_typing', ({ id, isTyping }) => {
      setTypingPlayers(prev => ({ ...prev, [id]: isTyping }));
    });

    socket.on('game_won', ({ winner, word }) => {
        setIsWon(true);
        setLastWord(word);
        
        // ФЕЄРВЕРКИ
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
        }, 250);
    });

    socket.on('room_restarted', ({ history }) => {
        setAttempts(history);
        setLastWord('********');
        setIsWon(false);
        setGuess('');
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

    const handleRestart = () => {
        socket.emit('restart_room', { roomId: user.roomId });
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

        {/* YOU DID IT OVERLAY */}
        <AnimatePresence>
            {isWon && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-bg"
                >
                    <motion.h1 
                        initial={{ scale: 0.5, y: 50 }} animate={{ scale: 1, y: 0 }}
                        className="text-6xl font-black text-green-500 tracking-[0.3em] mb-8"
                    >
                        YOU DID IT!
                    </motion.h1>
                    <button 
                        onClick={handleRestart}
                        className="px-8 py-3 border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition-all font-bold tracking-widest uppercase"
                    >
                        [ Reboot System / Restart ]
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
      
        {/* HEADER */}
        <div className="border-b border-zinc-900 pb-4 mb-6 flex justify-between items-end">
            
            {/* LEFT: Room ID & Leave */}
            <div className="flex flex-col gap-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                    Room_ID: <span className="text-white">{user.roomId}</span>
                </div>
                <button 
                    onClick={handleLeave}
                    className="text-[9px] border border-zinc-800 px-2 py-1 text-zinc-600 hover:text-red-500 hover:border-red-900 transition-colors uppercase tracking-widest text-left w-fit"
                >
                    [ Leave_Session ]
                </button>
            </div>

            {/* CENTER: Counter & Word & SYSTEM BUTTONS */}
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-6">
                    <span className="text-zinc-800 font-black text-3xl">[{attempts.length}]</span>
                    <motion.span 
                        key={lastWord}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-zinc-200 text-3xl font-light tracking-[0.5em]"
                    >
                        {lastWord}
                    </motion.span>
                </div>

                {/* NEW SYSTEM BUTTONS */}
                <div className="flex gap-4">
                    <button 
                        onClick={handleRequestHint}
                        className="text-[9px] border border-blue-900/50 px-3 py-1 text-blue-500/70 hover:text-blue-400 hover:border-blue-500 transition-all uppercase tracking-widest"
                    >
                        {'>'} Decipher_Hint
                    </button>
                    <button 
                        onClick={handleRestart}
                        className="text-[9px] border border-green-900/50 px-3 py-1 text-green-500/70 hover:text-green-400 hover:border-green-500 transition-all uppercase tracking-widest"
                    >
                        {'>'} Reboot_Level
                    </button>
                </div>
            </div>

            {/* RIGHT: Players count */}
            <div className="text-right text-[10px] text-zinc-500 uppercase tracking-widest">
                Players: <span className="text-white">{players.length} / 3</span>
            </div>

        </div>

        {/* BLACK ARCHIVE UNIT (Зліва знизу) */}
        <div className="absolute bottom-4 left-4 w-48 pointer-events-none">
            <div className="text-[9px] text-red-900 mb-2 tracking-[0.3em] uppercase border-b border-red-900/30 flex justify-between">
                <span>System_Trash</span>
                <span className="animate-pulse">●</span>
            </div>
            
            <AnimatePresence>
                {rejectedWord && (
                    <motion.div
                        initial={{ y: -20, x: 20, opacity: 0, scale: 1.5 }}
                        animate={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 1.5, ease: "easeIn" }}
                        className="text-red-500 font-bold text-xs mb-2 tracking-widest"
                    >
                        {rejectedWord} {'>>'} REJECTED
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Список в архіві */}
            <div className="space-y-1 opacity-20">
                {archive.map((w, i) => (
                    <div key={i} className="text-[8px] text-zinc-500 line-through truncate uppercase">
                        {w}
                    </div>
                ))}
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
                att.player === "SYSTEM_DECODER" 
                    ? "border-blue-500/50 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                    : att.word === lastWord 
                    ? "border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                    : "border-zinc-800"
                }`}
              >
                <div className="flex justify-between text-[9px] uppercase tracking-widest mb-1">
                <span className={att.player === "SYSTEM_DECODER" ? "text-blue-400 font-bold" : "text-zinc-500"}>
                    {att.player === "SYSTEM_DECODER" ? "!!! SYSTEM_DECODER_HINT !!!" : `Source: ${att.player}`}
                </span>
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