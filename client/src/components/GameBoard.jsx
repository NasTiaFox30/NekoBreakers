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
    const [lastRank, setLastRank] = useState(null);
    const [rejectedWord, setRejectedWord] = useState(null);
    const [isWon, setIsWon] = useState(false);
    const [winnerName, setWinnerName] = useState(null);
    const [restartStatus, setRestartStatus] = useState(null); // {votes, total}
    const [revealedWord, setRevealedWord] = useState(null);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  
    // Реф для контейнера списку спроб
    const scrollRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Слухач клавіші TAB
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                handleShowTop();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ЛОГІКА СКРОЛУ: Фокус на 3 сек -> Повернення на ТОП
    useEffect(() => {
        if (scrollRef.current && (lastWord !== '********' || lastHint)) {
            const targetWord = lastHint || lastWord;
            const elements = scrollRef.current.querySelectorAll('.bg-zinc-900\\/40');
            const activeElement = Array.from(elements).find(el => 
                el.textContent.includes(targetWord)
            );

            if (activeElement) {
                // Скролимо до нового слова/підказки
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Повертаємось на початок
                const returnTimer = setTimeout(() => {
                    handleShowTop();
                }, 3000);

                return () => clearTimeout(returnTimer);
            }
        }
    }, [attempts, lastWord, lastHint]); //При зміні списку, останнього слова, підказки

    // Cокет-слухачі для оновлення стану гри
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
            setLastWord(newAttempt.word);
            setLastRank(newAttempt.rank); 

            if (newAttempt.player === "SYSTEM_DECODER") {
                setLastHint(newAttempt.word);
            } else {
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
            
            // Kонфеті
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };
            confetti({ ...defaults, particleCount: 150, origin: { x: 0.5, y: 0.5 } });
        });

        socket.on('restart_progress', (data) => {
            setRestartStatus(data);
        });

        socket.on('reveal_word', ({ word, isWin, winnerName }) => {
            setRevealedWord(word);
            if (isWin) {
                setIsWon(true);
                setWinnerName(winnerName);
            }
            setRestartStatus(null); 
        });

        socket.on('room_restarted', () => {
            setAttempts([]);
            setArchive([]);
            setLastWord('********');
            setLastRank(null);
            setLastHint(null);
            setIsWon(false);
            setWinnerName(null);
            setGuess('');
            setRevealedWord(null);
            setRestartStatus(null);
        });

        return () => {
            socket.off('player_joined');
            socket.off('receive_history');
            socket.off('display_typing');
            socket.off('receive_guess');
            socket.off('game_won');
            socket.off('room_restarted');
        };
    }, [socket]);


    const handleShowTop = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleRequestHint = () => {
        if (window.confirm("Використати системний дешифратор для підказки?")) {
            socket.emit('request_hint', { roomId: user.roomId, player: user.username });
        }
    };

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
        // Перевірка, чи користувач вже голосував
        const hasVoted = restartStatus?.voters?.includes(user.username);

        if (hasVoted) {
            socket.emit('cancel_restart', { roomId: user.roomId, username: user.username });
        } else {
            socket.emit('restart_room', { roomId: user.roomId, username: user.username });
        }
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
    <div className="h-screen w-full bg-black text-white font-mono flex flex-col p-4 md:p-6 overflow-hidden select-none">
        <AnimatePresence>
            {/* REVEAL OVERLAY (Win/Restart) */}
            {revealedWord && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-[150] flex flex-col items-center justify-center backdrop-blur-xl transition-colors duration-1000 ${
                        isWon ? 'bg-green-950/90' : 'bg-red-950/90'
                    }`}
                >
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="text-center px-6">
                        <div className={`${isWon ? 'text-green-500' : 'text-red-500'} text-[10px] md:text-xs tracking-[0.6em] mb-2 uppercase animate-pulse font-black`}>
                            {isWon ? '>>> ACCESS_GRANTED <<<' : '>>> SYSTEM_OVERRIDE / DATA_REVEALED<<<'}
                        </div>
                    
                    {isWon && winnerName && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }}
                            className="text-white text-sm md:text-lg font-bold mb-4 tracking-widest uppercase"
                        >
                            WINNER: <span className="text-green-400">@{winnerName}</span>
                        </motion.div>
                    )}
                    
                    <div className={`text-5xl md:text-8xl font-black text-white tracking-[0.2em] mb-10 bg-white/5 py-6 border-y ${
                        isWon ? 'border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.4)]' : 'border-red-500/50'
                    } uppercase`}>
                        {revealedWord}
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        <div className="w-48 md:w-64 h-1 bg-white/10 overflow-hidden rounded-full">
                            <motion.div 
                                initial={{ x: "-100%" }}
                                animate={{ x: "0%" }}
                                transition={{ duration: isWon ? 7 : 5, ease: "linear" }}
                                className={`h-full ${isWon ? 'bg-green-500' : 'bg-red-500'}`}
                            />
                        </div>
                        <span className="text-[10px] text-white/40 tracking-[0.3em] uppercase font-mono">
                            {isWon ? 'Syncing next security layer...' : 'Emergency reboot in progress...'}
                        </span>
                    </div>
                </motion.div>
            </motion.div>
            )}

            {/* СТАТУС ГОЛОСУВАННЯ */}
            {restartStatus && restartStatus.votes > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="text-[10px] text-orange-500 animate-pulse tracking-widest text-center"
                >
                    REBOOT_VOTES: {restartStatus.votes} / {restartStatus.total} CONFIRMED...
                </motion.div>
            )}
        </AnimatePresence>


        {/* ==== MAIN LAYOUT ==== */}

        {isMobileView ? (
            /* --- MOBILE LAYOUT --- */

            <div className="flex flex-col">
                {/* Спрощений хедер */}
                <div className="flex justify-between items-center mb-2 text-[9px] text-zinc-500 uppercase tracking-widest">
                    <button 
                        onClick={handleLeave}
                        className="text-[9px] border border-zinc-800 px-2 py-1 text-zinc-600 hover:text-red-500 hover:border-red-900 transition-colors uppercase tracking-widest text-left w-fit"
                        >
                            [ Leave ]
                    </button>
                    <span>ID: {user.roomId}</span>                    
                    <span>{players.length}/3 Hackers</span>
                </div>

                {/* ГОРИЗОНТАЛЬНА ПАНЕЛЬ ГРАВЦІВ */}
                <div className="flex justify-center items-center gap-4 py-2 border-b border-zinc-900/50 mb-2 bg-zinc-950/20 flex-shrink-0">
                    {players.map(p => (
                        <div key={p.id} className="w-16 flex-shrink-0 flex justify-center">
                            <Avatar 
                                username={p.username} 
                                isMain={p.username === user.username}
                                isTyping={p.id === socket.id ? guess.length > 0 : typingPlayers[p.id]} 
                                submitted={lastSubmiter?.username === p.username ? lastSubmiter.timestamp : 0}
                                isMobile={p.isMobile}
                                isCompact={true} 
                            />
                        </div>
                    ))}
                </div>

                {/* CENTER PROCESSING UNIT */}
                <div ref={scrollRef} className="max-w-lg min-h-100 max-h-105 overflow-y-scroll custom-scrollbar flex flex-col gap-1 px-1 py-2 scroll-smooth">
                    <AnimatePresence initial={false}>
                        {attempts.map((att) => (
                            <motion.div 
                                layout
                                id={`attempt-${att.timestamp}`}
                                key={att.timestamp}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className={`bg-zinc-900/40 border p-1.5 font-mono relative transition-colors duration-500 ${
                                    att.player === "SYSTEM_DECODER" 
                                    ? "border-blue-500/50 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                                    : att.word === lastWord 
                                        ? "border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                                        : "border-zinc-800"
                                }`}
                            >
                                <div className="flex justify-between text-[8px] uppercase tracking-widest mb-0.2 opacity-70">
                                    <span className={att.player === "SYSTEM_DECODER" ? "text-blue-400 font-bold" : "text-zinc-500"}>
                                        {att.player === "SYSTEM_DECODER" ? "!!! SYSTEM_DECODER_HINT !!!" : `Source: ${att.player}`}
                                    </span>
                                    <span className={att.rank <= 500 ? "text-green-400" : "text-zinc-400"}>
                                        Rank: {att.rank}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold tracking-widest text-white min-w-[80px] uppercase">
                                        {att.word}
                                    </span>
                                    <div className="flex-1 h-1 bg-zinc-950 border border-zinc-800 relative overflow-hidden">
                                        <motion.div 
                                            layout
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(5, 100 - (att.rank / 100))}%` }}
                                            className={`h-full ${att.rank <= 500 ? "bg-green-500" : "bg-zinc-700"}`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        ) : (

            /* --- DESKTOP LAYOUT --- */
            <>
            {/* HEADER */}
            <div className="flex-shrink-0 border-b border-zinc-900 pb-4 mb-4 flex justify-between items-end h-20">
            
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
                        <div className="flex items-center">
                            <AnimatePresence>
                                {/* ОСТАННЄ СЛОВО*/}
                                <motion.span 
                                    key={lastWord}
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-zinc-200 text-3xl font-light tracking-[0.5em] uppercase"
                                >
                                    {lastWord}
                                </motion.span>
                                {/* РАНГ */}
                                {lastRank && (
                                    <motion.span 
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className={`text-[14px] tracking-[0.3em] font-bold mt-1 border-b ${
                                            lastRank <= 500 ? 'text-green-500' : 'text-zinc-500'
                                        }`}
                                    >
                                        {lastRank}{'★'}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                {/* SYSTEM BUTTONS */}
                    <div className="flex gap-4">
                        <button 
                            onClick={handleRequestHint}
                            className="text-[9px] border border-blue-900/50 px-3 py-1 text-blue-500/70 hover:text-blue-400 transition-all uppercase tracking-widest"
                            >
                                {'>'} Decipher_Hint
                        </button>

                        <button 
                            onClick={handleRestart}
                            disabled={isWon || revealedWord}
                            className={`text-[9px] border px-3 py-1 transition-all uppercase tracking-widest ${
                                restartStatus?.voters?.includes(user.username)
                                ? "border-orange-500 text-orange-500" 
                                : "border-green-900/50 text-green-500/70"
                            }`}
                        >
                            {restartStatus?.voters?.includes(user.username) ? '[ Cancel_Reboot ]' : '> Reboot_Level'}
                        </button>
                    </div>
                </div>

                {/* Players Count */}
                <div className="text-right text-[10px] text-zinc-500 uppercase tracking-widest">
                    Players: <span className="text-white">{players.length} / 3</span>
                </div>

            </div>

            {/* MAIN AREA */}
            <div className="flex-1 flex justify-between items-center overflow-hidden px-8 min-h-0">                
                {/* LEFT SECTOR */}
                <div className="flex-shrink-0 w-32 space-y-12">
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
                <div className="flex-1 flex justify-center h-full max-h-[50vh] px-4">
                    <div ref={scrollRef} className="w-full max-w-xl overflow-y-auto custom-scrollbar flex flex-col gap-3 px-4 py-2 scroll-smooth">
                        <AnimatePresence initial={false}>
                            {attempts.map((att) => (
                                <motion.div 
                                    layout
                                    id={`attempt-${att.timestamp}`}
                                    key={att.timestamp}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className={`bg-zinc-900/40 border p-1.5 font-mono relative transition-colors duration-500 ${
                                    att.player === "SYSTEM_DECODER" 
                                    ? "border-blue-500/50 bg-blue-900/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                                    : att.word === lastWord 
                                        ? "border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.2)]" 
                                        : "border-zinc-800"
                                }`}
                            >
                                <div className="flex justify-between text-[8px] uppercase tracking-widest mb-0.2 opacity-70">
                                    <span className={att.player === "SYSTEM_DECODER" ? "text-blue-400 font-bold" : "text-zinc-500"}>
                                        {att.player === "SYSTEM_DECODER" ? "!!! SYSTEM_DECODER_HINT !!!" : `Source: ${att.player}`}
                                    </span>
                                    <span className={att.rank <= 500 ? "text-green-400" : "text-zinc-400"}>
                                        Rank: {att.rank}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold tracking-widest text-white min-w-[80px] uppercase">
                                        {att.word}
                                    </span>
                                    <div className="flex-1 h-1 bg-zinc-950 border border-zinc-800 relative overflow-hidden">
                                        <motion.div 
                                            layout
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.max(5, 100 - (att.rank / 100))}%` }}
                                            className={`h-full ${att.rank <= 500 ? "bg-green-500" : "bg-zinc-700"}`}
                                        />
                                    </div>
                                </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* RIGHT SECTOR */}
                <div className=" flex-shrink-0 w-32 space-y-12">
                    {rightSide.map(p => (
                        <Avatar 
                            key={p.id}
                            username={p.username}
                            isTyping={typingPlayers[p.id]}
                            submitted={lastSubmiter?.username === p.username ? lastSubmiter.timestamp : 0} isMobile={p.isMobile}
                        />
                    ))}
                </div>
            </div>

            {/* BLACK ARCHIVE (Hidden on mobile to save space) */}
            <div className="relative mt-auto mx-auto w-full max-w-sm px-15 py-2">
                <div className="flex gap-4 text-[8px] text-red-900/50 mb-2 tracking-[0.3em] uppercase border-b border-red-900/20 flex justify-between items-center">
                    <span>Trash</span>

                    <AnimatePresence mode="wait">
                        {rejectedWord && (
                            <motion.div 
                                key={rejectedWord}
                                initial={{ x: -10, opacity: 0 }} 
                                animate={{ x: 0, opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                className="text-red-500 font-bold text-[9px] tracking-tighter uppercase whitespace-nowrap"
                            >
                                {rejectedWord} !
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-center gap-2">
                        <div className="flex gap-1 opacity-30">
                            {archive.slice(0, 3).map((_, i) => (
                                <span key={i} className="w-1 h-1 bg-red-900 rounded-full"></span>
                            ))}
                        </div>
                        <span className="animate-pulse">●</span>
                    </div>
                </div>
            </div>
            </>
        )}


        {/* CONTROL DECK */}
        <div className={`flex-shrink-0 mt-auto pt-2 w-full max-w-5xl mx-auto flex flex-col
            ${isMobileView ? 'items-center' : 'items-end pr-10'}`}
        >
            {!isMobileView && 
                <Avatar 
                    isMain={true} 
                    username={user.username} 
                    isTyping={guess.length > 0} 
                    submitted={lastSubmit}
                    isMobile={user.isMobile}
                />
            }
            <div className="w-full mt-2 flex gap-2">
                <div className="flex-1 border border-zinc-800 bg-zinc-950 p-4 shadow-2xl relative">
                    <form onSubmit={handleSubmit} className="flex gap-4">
                        <span className="text-zinc-600 animate-pulse">{'>'}</span>
                        <input
                            type="text"
                            autoFocus
                            className="flex-1 bg-transparent outline-none uppercase text-sm tracking-widest"
                            placeholder={isMobileView ? "TYPE..." : "TYPE CODE TO BREAK..."}
                            value={guess}
                            onChange={(e) => {
                                setGuess(e.target.value);
                                socket.emit('typing', { roomId: user.roomId, isTyping: e.target.value.length > 0 });
                            }}
                        />
                    </form>
                    {/* Підказка */}
                    {!isMobileView && 
                        <div className="absolute pointer-events-none right-4 top-1/2 -translate-y-1/2 text-[8px] text-zinc-700 hidden md:block uppercase">
                            PRESS [TAB] TO VIEW TOP
                        </div>
                    }
                </div>

                {/* Кнопка швидкого повернення вгору */}
                <button 
                    onClick={handleShowTop}
                    className="border border-zinc-800 bg-zinc-950 px-4 hover:bg-zinc-900 transition-colors flex flex-col justify-center items-center gap-1 group"
                >
                    <span className="text-sm text-zinc-500 group-hover:text-white uppercase tracking-widest">{isMobileView ? "^" : "TOP ^"}</span>
                </button>
            </div>
            
            {isMobileView && (
                <div className="flex gap-2 w-full mt-2">
                    <button onClick={handleRequestHint} className="flex-1 text-[8px] border border-blue-900/50 py-2 text-blue-500 uppercase">Hint</button>
                    <button onClick={handleRestart} className={`flex-1 text-[8px] border py-2 uppercase ${restartStatus?.voters?.includes(user.username) ? "border-orange-500 text-orange-500" : "border-green-900/50 text-green-500"}`}>
                    {restartStatus?.voters?.includes(user.username) ? 'Cancel' : 'Reboot'}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default GameBoard;