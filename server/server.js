const express = require('express');
const axios = require('axios');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {};
const deletionTimers = {};

const PORT = process.env.PORT || 3000;

// Базові URL для вашого мікросервісу на Hugging Face
const BRAIN_BASE_URL = 'https://nastiafox30-neko-brakers-core.hf.space';

/**
 * Функція для отримання випадкового слова безпосередньо з нейромережі
 */
async function fetchRandomWord() {
    try {
        const response = await axios.get(`${BRAIN_BASE_URL}/get_word`, { timeout: 7000 });
        return response.data.word; // Очікуємо слово у форматі { word: "СЛОВО" }
    } catch (error) {
        console.error("Помилка отримання слова з ядра:", error.message);
        // Запасний список на випадок збою мережі
        const fallback = ["КУХНЯ", "ПРОГРАМА", "МЕРЕЖА", "КІБЕРНЕТИКА", "КОТЯРА"];
        return fallback[Math.floor(Math.random() * fallback.length)];
    }
}

async function calculateRank(word, target) {
    if (word === target) return 1;
    try {
        const response = await axios.post(`${BRAIN_BASE_URL}/similarity`, {
            word1: word.toLowerCase(),
            word2: target.toLowerCase()
        }, { timeout: 15000 });
        
        // Повертаємо 0 для архіву або реальну цифру (1 - 300,000+)
        return response.data.rank; 
    } catch (error) {
        console.error("Brain Error:", error.message);
        return 499999; // Fallback (помилки мережі або ядра)
    }
}

io.on('connection', (socket) => {
    socket.on('join_room', async ({ roomId, username, isOwner, isMobile }) => {
        console.log(`Гравець ${username} заходить у ${roomId}`);

        // Скасування видалення кімнати
        if (deletionTimers[roomId]) {
            clearTimeout(deletionTimers[roomId]);
            delete deletionTimers[roomId];
            console.log(`Кімнату ${roomId} врятовано від видалення`);
        }

        socket.join(roomId);
        
        if (!rooms[roomId]) {
            const targetWord = await fetchRandomWord(); 
            rooms[roomId] = {
                ownerId: isOwner ? socket.id : null,
                targetWord: targetWord,
                players: [],
                history: [],
                restartVotes: new Set(),
                isRestarting: false
            };
            console.log(`Кімната ${roomId} активована. Ціль: ${targetWord}`);
        }

        // Перевірка на перепідключення (Persistence)
        const existingPlayer = rooms[roomId].players.find(p => p.username === username);
        if (existingPlayer) {
            existingPlayer.id = socket.id;
            existingPlayer.isMobile = isMobile;
        } else {
            rooms[roomId].players.push({ id: socket.id, username, isOwner, isMobile });
        }

        // отримуємо оновлений список гравців у кімнаті
        io.to(roomId).emit('player_joined', rooms[roomId].players);

        // Відправляємо історію конкретному сокету
        socket.emit('receive_history', rooms[roomId].history);
    });

    socket.on('request_hint', async ({ roomId, player }) => {
        if (!rooms[roomId]) return;
        try {
            const target = rooms[roomId].targetWord;
            // Звертаємося до ендпоінту get_hint у Python
            const response = await axios.get(`${BRAIN_BASE_URL}/get_hint/${target.toLowerCase()}`);
            
            const hintAttempt = {
                player: "SYSTEM_DECODER", // Позначаємо, що це підказка
                word: response.data.word,
                rank: response.data.rank,
                timestamp: Date.now()
            };

            // Додаємо в історію та розсилаємо всім
            rooms[roomId].history.push(hintAttempt);
            io.to(roomId).emit('receive_guess', hintAttempt);
            
            console.log(`Підказка видана для кімнати ${roomId}: ${hintAttempt.word}`);
        } catch (error) {
            console.error("Помилка отримання підказки:", error.message);
        }
    });

    socket.on('send_guess', async ({ word, player, roomId }) => {
        if (!rooms[roomId]) return;

        const cleanWord = word.trim().toUpperCase();
        const target = rooms[roomId].targetWord;
        
        const rank = await calculateRank(cleanWord, target);
        
        const attempt = {
            player,
            word: cleanWord,
            rank: rank,
            timestamp: Date.now()
        };

        rooms[roomId].history.push(attempt);
        
        // Розсилаємо ВСІМ у кімнаті
        io.to(roomId).emit('receive_guess', attempt);

        if (rank === 1) {
            const room = rooms[roomId];
            room.isRestarting = true; // Блокуємо нові введення

            // Розкриваємо слово (перемога)
            io.to(roomId).emit('reveal_word', { 
                word: cleanWord, 
                isWin: true,
                winnerName: player
            });

            // Подія перемоги (конфеті)
            io.to(roomId).emit('game_won', { winner: player, word: cleanWord });

            // Авто-перехід
            setTimeout(async () => {
                const newWord = await fetchRandomWord();
                room.targetWord = newWord;
                room.history = [];
                room.restartVotes = new Set();
                room.isRestarting = false;
                io.to(roomId).emit('room_restarted', { history: [] });
            }, 7000);
        }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
        // Відправляємо анімацію всім КРІМ того, хто друкує
        socket.to(roomId).emit('display_typing', { id: socket.id, isTyping });
    });

    const handleLeave = (socketId) => {
        for (const roomId in rooms) {
            const playerIndex = rooms[roomId].players.findIndex(p => p.id === socketId);
            if (playerIndex !== -1) {
                rooms[roomId].players.splice(playerIndex, 1);
                
                if (rooms[roomId].players.length === 0) {
                    // Видалення через 10 хвилин, якщо ніхто не повернувся
                    deletionTimers[roomId] = setTimeout(() => {
                        delete rooms[roomId];
                        console.log(`Кімната ${roomId} видалена за неактивність`);
                    }, 10 * 60 * 1000); 
                } else {
                    io.to(roomId).emit('player_joined', rooms[roomId].players);
                }
            }
        }
    };

    socket.on('restart_room', ({ roomId, username }) => {
        if (!rooms[roomId]) return;
        
        const room = rooms[roomId];
        
        // Якщо рестарт вже в процесі, ігноруємо нові запити
        if (room.isRestarting) return;

        // Додаємо голос гравця
        if (!room.restartVotes) room.restartVotes = new Set();
        room.restartVotes.add(username);

        const totalPlayers = room.players.length;
        const currentVotes = room.restartVotes.size;

        // Повідомляємо всіх про стан голосування
        io.to(roomId).emit('restart_progress', {
            votes: currentVotes,
            total: totalPlayers,
            voters: Array.from(room.restartVotes)
        });

        // Якщо всі підтвердили
        if (currentVotes >= totalPlayers) {
            room.isRestarting = true;
            
            // Розкриваємо слово всім
            io.to(roomId).emit('reveal_word', { 
                word: room.targetWord,
                message: "SYSTEM: Manual override. Decrypting target..." 
            });

            // Таймер на 5 секунд перед новою грою
            setTimeout(async () => {
                const newWord = await fetchRandomWord();
                room.targetWord = newWord;
                room.history = [];
                room.restartVotes = new Set();
                room.isRestarting = false;

                console.log(`Нова гра в ${roomId}. Ціль: ${newWord}`);

                io.to(roomId).emit('room_restarted', { 
                    message: "SYSTEM: New session initialized.",
                    history: [] 
                });
            }, 5000);
        }
    });

    socket.on('leave_room', () => {
        handleLeave(socket.id);
        socket.disconnect(); // Розірвати з'єднання з клієнтом після виходу
    });

    socket.on('disconnect', () => {
        handleLeave(socket.id);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`NekoBreakers Server: Running on port ${PORT}`);
    console.log(`Global access enabled via 0.0.0.0`);
});