const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const rooms = {};
const deletionTimers = {}; // { roomId: timeoutId }

// Список слів для прикладу (потім заміна на семантичну базу)
const WORDS_DATABASE = ["APPLE", "COFFEE", "LAPTOP", "HACKER", "CAT", "ROUTER"];


io.on('connection', (socket) => {
    socket.on('join_room', ({ roomId, username, isOwner }) => {
        // Якщо кімната була в черзі на видалення — скасовуємо
        if (deletionTimers[roomId]) {
            clearTimeout(deletionTimers[roomId]);
            delete deletionTimers[roomId];
            console.log(`Кімнату ${roomId} врятовано від видалення`);
        }

        socket.join(roomId);
        
        if (!rooms[roomId]) {
            rooms[roomId] = {
                ownerId: isOwner ? socket.id : null,
                targetWord: WORDS_DATABASE[Math.floor(Math.random() * WORDS_DATABASE.length)],
                players: [],
                history: []
            };
        }

        // Перевірка на перепідключення (Persistence)
        const existingPlayer = rooms[roomId].players.find(p => p.username === username);
        if (existingPlayer) {
            existingPlayer.id = socket.id;
        } else {
            rooms[roomId].players.push({ id: socket.id, username, isOwner });
        }

        // отримуємо оновлений список гравців у кімнаті
        io.to(roomId).emit('player_joined', rooms[roomId].players);

        // Відправляємо історію конкретному сокету
        socket.emit('receive_history', rooms[roomId].history);
    });

    const handleLeave = (socketId) => {
        for (const roomId in rooms) {
            const playerIndex = rooms[roomId].players.findIndex(p => p.id === socketId);
            
            if (playerIndex !== -1) {
                const isLeavingOwner = rooms[roomId].players[playerIndex].id === rooms[roomId].ownerId;
                rooms[roomId].players.splice(playerIndex, 1);

                // Якщо вийшов власник, призначаємо нового (якщо є хтось інший)
                if (isLeavingOwner && rooms[roomId].players.length > 0) {
                    rooms[roomId].ownerId = rooms[roomId].players[0].id;
                    rooms[roomId].players[0].isOwner = true;
                }

                // Якщо кімната порожня — ставимо таймер на 10 хвилин
                if (rooms[roomId].players.length === 0) {
                    deletionTimers[roomId] = setTimeout(() => {
                        delete rooms[roomId];
                        console.log(`Кімнату ${roomId} видалено за неактивність (10 хв)`);
                    }, 10 * 60 * 1000); 
                } else {
                    io.to(roomId).emit('player_joined', rooms[roomId].players);
                }
            }
        }
    };

    socket.on('send_guess', ({ word, player, roomId }) => {
        if (!rooms[roomId]) return;

        const cleanWord = word.trim().toUpperCase();
        
        // Тимчасовий ранг (замінимо на семантику пізніше)
        const isWin = cleanWord === rooms[roomId].targetWord;
        const rank = isWin ? 1 : Math.floor(Math.random() * 5000) + 2; 
        
        const attempt = {
            player,
            word: cleanWord,
            rank: rank,
            timestamp: Date.now()
        };

        rooms[roomId].history.push(attempt);
        
        // Розсилаємо ВСІМ у кімнаті
        io.to(roomId).emit('receive_guess', attempt);

        if (isWin) {
            io.to(roomId).emit('game_won', { winner: player, word: cleanWord });
        }
    });

    socket.on('typing', ({ roomId, isTyping }) => {
        // Відправляємо анімацію всім КРІМ того, хто друкує
        socket.to(roomId).emit('display_typing', { id: socket.id, isTyping });
    });

    socket.on('leave_room', () => {
        handleLeave(socket.id);
        socket.disconnect(); // Розірвати з'єднання з клієнтом після виходу
    });

});

server.listen(3000, '0.0.0.0', () => {
    console.log('NekoBreakers Server - active on port 3000 (Global access)');
});