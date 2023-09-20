const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let players = {};
let bullets = [];
let waitingPlayers = [];

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        let parsedData = JSON.parse(data);

        if (parsedData.type === 'matchmaking') {
            ws._playerId = parsedData.id;
            waitingPlayers.push({ ws: ws, id: parsedData.id });

            if (waitingPlayers.length >= 2) {
                const player1 = waitingPlayers.shift();
                const player2 = waitingPlayers.shift();

                const matchId = generateMatchId();

                player1.ws.send(JSON.stringify({ type: 'matchFound', matchId: matchId, player: 'Player 1' }));
                player2.ws.send(JSON.stringify({ type: 'matchFound', matchId: matchId, player: 'Player 2' }));
            }
        } else if (parsedData.type === 'updatePosition') {
            players[parsedData.id] = parsedData.position;

            wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) { 
                    client.send(JSON.stringify({ type: 'updatePlayers', players: players }));
                }
            });

            // Collision detection logic
            bullets.forEach((bullet, index) => {
                Object.keys(players).forEach(playerId => {
                    if (checkCollision(bullet, players[playerId])) {
                        // Remove the bullet and notify clients
                        bullets.splice(index, 1);
                        wss.clients.forEach(function each(client) {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({ type: 'removeBullet', bulletId: bullet.id }));
                            }
                        });
                    }
                });
            });
        } else if (parsedData.type === 'fireBullet') {
            bullets.push(parsedData.bullet);
            wss.clients.forEach(function each(client) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'fireBullet', ...parsedData }));
                }
            });
        }
    });

    ws.on('close', function close() {
        waitingPlayers = waitingPlayers.filter(player => player.ws !== ws);
        if (ws._playerId) {
            delete players[ws._playerId];
        }
    });
});

function generateMatchId() {
    return Math.random().toString(36).substr(2, 9);
}

function checkCollision(bullet, player) {
    const bulletX = bullet.x;
    const bulletY = bullet.y;
    const playerX = player.x;
    const playerY = player.y;
    const playerWidth = 50; // Sostituisci con la larghezza effettiva del giocatore
    const playerHeight = 50; // Sostituisci con l'altezza effettiva del giocatore

    if (
        bulletX < playerX + playerWidth &&
        bulletX + bullet.width > playerX &&
        bulletY < playerY + playerHeight &&
        bulletY + bullet.height > playerY
    ) {
        return true;
    }
    return false;
}


console.log('Server is running on ws://localhost:8080');
