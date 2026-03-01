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
        
        // Ми отримуємо пряме значення позиції (1, 45, 1200...)
        return response.data.rank || 4999;
        
    } catch (error) {
        console.error("Brain Error:", error.message);
        return 4999; 
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
                history: []
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
            io.to(roomId).emit('game_won', { winner: player, word: cleanWord });
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

    // Рестарт гри (тільки для власника кімнати або за домовленістю)
    socket.on('restart_room', async ({ roomId }) => {
        if (!rooms[roomId]) return;

        console.log(`Рестарт кімнати ${roomId}`);
        const newWord = await fetchRandomWord(); // Беремо нове слово з Python
        
        rooms[roomId].targetWord = newWord;
        rooms[roomId].history = []; // Очищаємо історію
        console.log(`Кімната ${roomId} активована. Ціль: ${newWord}`);

        // Повідомляємо всіх, що гра почалася знову
        io.to(roomId).emit('room_restarted', { 
            message: "SYSTEM: Database wiped. New encryption detected.",
            history: [] 
        });
    });

    socket.on('leave_room', () => {
        handleLeave(socket.id);
        socket.disconnect(); // Розірвати з'єднання з клієнтом після виходу
    });

    socket.on('disconnect', () => {
        handleLeave(socket.id);
    });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('NekoBreakers Server: Running on port 3000');
});