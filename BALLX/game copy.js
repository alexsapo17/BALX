import { BulletManager } from './bullets.js';

// Definisci la scena iniziale
let MenuScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function() {
      Phaser.Scene.call(this, { key: 'menuScene' });
    },
    create: function() {
      this.add.text(600, 300, 'Balls War', { fill: '#ffffff' });
      
      let searchMatchButton = this.add.text(600, 400, 'Cerca Partita', { fill: '#0f0' })
      .setInteractive()
      .on('pointerdown', () => this.scene.start('gameScene'));

      let playWithFriendButton = this.add.text(600, 450, 'Gioca con un Amico', { fill: '#0f0' })
        .setInteractive()
        .on('pointerdown', () => {
          // Aggiungi la logica per giocare con un amico
          this.scene.start('gameScene');
        });
    }
  });
  // Definisci la scena del gioco
  let GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function() {
      Phaser.Scene.call(this, { key: 'gameScene' });
    },
    preload: preload,
    create: create,
    update: update
  });

  let config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true // Abilita il debug
        }
    },
    scene: [MenuScene, GameScene] // Ora includiamo entrambe le scene
};
let game = new Phaser.Game(config);

let player;
let otherPlayers = {};
let ws;
let playerId = Math.random().toString(36).substr(2, 9);  // ID univoco per il giocatore
let joystickBase = null;
let joystick = null;
let dragging = false;
let cursors;  // Aggiunto per gestire gli input da tastiera
let isWsOpen = false;
let currentMatchId = null;
let playerRole = null; 
let playerHealth = 100;
let otherPlayerHealth = 100;
let playerHealthBar;
let otherPlayerHealthBar;
let currentDirection = 0;  // 0 = su, 90 = destra, 180 = giù, 270 = sinistra
let gameContext;
let velocity = { x: 0, y: 0 };
let joystickPointerId = null;
const maxSpeed = 5;
const acceleration = 0.2;
const damping = 0.9;

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('shootArea').addEventListener('touchstart', function() {
        gameContext.bulletManager.fireBullet(player, velocity, isWsOpen, ws, currentMatchId);
    });
});



function preload() {
    this.load.image('ball', 'images/ball.png');
    this.load.image('bullet1', 'images/bullet1.png');
    this.load.image('bullet2', 'images/bullet2.png');
    this.load.image('bullet3', 'images/bullet3.png');
    this.load.image('bullet4', 'images/bullet4.png');
    this.load.image('bullet5', 'images/bullet5.png');
}

function create() {
    console.log('La scena di gioco è stata avviata. In attesa di dati del giocatore.');

    this.bulletManager = new BulletManager(this);

    for (const id in otherPlayers) {
        otherPlayers[id].destroy();
    }
    otherPlayers = {};
    playerRole = (parseInt(playerId[playerId.length - 1]) % 2 === 0) ? 'Player 1' : 'Player 2';

    if (playerRole === 'Player 1') {       
        player = this.physics.add.image(200, 360, 'ball');
        player.setCircle(50); 
        player.setScale(0.4);  // Aumenta la scala del 150%
 
        
    } else if (playerRole === 'Player 2') {
        player = this.physics.add.image(1080, 360, 'ball');
        player.setCircle(50);
        player.setScale(0.4);  // Aumenta la scala del 150%

        
  // Imposta un'area di collisione circolare con raggio 15
  
    }

    cursors = this.input.keyboard.createCursorKeys();
    gameContext = this;

    ws = new WebSocket('ws://192.168.1.40:8080');
    ws.addEventListener('message', receiveData.bind(this));



    ws.addEventListener('close', function(event) {
        console.log("WebSocket is closed now.");
        // Qui puoi aggiungere la logica per gestire la disconnessione
        // Ad esempio, mostrare un messaggio e ritornare al menu
        const disconnectText = this.add.text(600, 100, 'Connection Lost', { fill: '#fff' });
        this.time.delayedCall(2000, function() {
            disconnectText.destroy();
            // Qui potrebbe iniziare la logica per ritornare al menu
        }, [], this);
    }.bind(this));
    

    ws.addEventListener('error', function(event) {
        console.log("WebSocket error observed:", event);
    });
    ws.addEventListener('open', function(event) {
        console.log("WebSocket is open now.");
        isWsOpen = true;  // Imposta il flag a true
        requestMatchmaking();  // Richiesta di matchmaking quando il WebSocket è aperto
    });

    console.log("Player created:", player);
    console.log("WebSocket created:", ws);
    
    // Codice per il joystick
    this.input.on('pointerdown', function (pointer) {
        if (pointer.x < config.width / 2 && joystickPointerId === null) {
            // Codice per il joystick
            if (joystickBase === null && joystick === null) {
                joystickBase = this.add.circle(pointer.x, pointer.y, 50, 0x888888, 0.5);
                joystick = this.add.circle(pointer.x, pointer.y, 20, 0xFFFFFF, 0.7);
            } else {
                joystickBase.x = pointer.x;
                joystickBase.y = pointer.y;
                joystick.x = pointer.x;
                joystick.y = pointer.y;
            }
            joystickPointerId = pointer.id;  // Imposta l'ID del puntatore del joystick
            dragging = true; 
        }
    }, this);
    
    this.input.on('pointerup', function (pointer) {
        if (pointer.id === joystickPointerId) {
            joystickPointerId = null;  // Azzera l'ID del puntatore del joystick
            if (joystickBase) {
                joystickBase.destroy();
                joystickBase = null;
            }
            if (joystick) {
                joystick.destroy();
                joystick = null;
            }
            dragging = false;  // Imposta il flag di trascinamento su false
        }
    }, this);
    
    this.input.on('pointermove', function (pointer) {
        if (pointer.id === joystickPointerId) {
            joystick.x = pointer.x;
            joystick.y = pointer.y;
        }
    }, this);

    this.input.keyboard.on('keydown_SPACE', () => {
            this.bulletManager.fireBullet(player, velocity);
        });
    
        // Mostra il messaggio di "Ricerca in corso..." quando il WebSocket si apre
        this.searchingText = this.add.text(600, 100, 'Ricerca in corso...', { fill: '#fff' });

        // Inizia un timer di 30 secondi per la ricerca di un avversario
        this.time.delayedCall(30000, function() {
            if (!currentMatchId) { // Se non è stata trovata una partita
                this.searchingText.setText('Nessun avversario trovato, tornando al menu...');
                this.time.delayedCall(2000, function() {
                    this.scene.start('menuScene');
                    playerId = Math.random().toString(36).substr(2, 9);  // Genera un nuovo ID per il giocatore
                }, [], this);                
            }
        }, [], this);

        this.physics.add.collider(player, this.bulletManager.bullets1, handlePlayerBulletCollision, null, this);
        this.physics.add.collider(player, this.bulletManager.bullets2, handlePlayerBulletCollision, null, this);
        this.physics.add.collider(player, this.bulletManager.bullets3, handlePlayerBulletCollision, null, this);
        this.physics.add.collider(player, this.bulletManager.bullets4, handlePlayerBulletCollision, null, this);
        this.physics.add.collider(player, this.bulletManager.bullets5, handlePlayerBulletCollision, null, this);



        playerHealthBar = this.add.graphics();
        otherPlayerHealthBar = this.add.graphics();
        drawHealthBars();
        sendPosition(player.x, player.y);

    } 
    
    function drawHealthBars() {
    playerHealthBar.clear();
    playerHealthBar.fillStyle(0x00FF00);
    playerHealthBar.fillRect(10, 10, playerHealth, 10);

    otherPlayerHealthBar.clear();
    otherPlayerHealthBar.fillStyle(0x00FF00);
    otherPlayerHealthBar.fillRect(1170, 10, otherPlayerHealth, 10);  // Posizione aggiornata per il secondo giocatore
}

function handlePlayerBulletCollision(player, bullet) {
    if (bullet.getData("owner") === "otherPlayer") {
        bullet.destroy();
        playerHealth -= 10;  // Diminuisci la vita del giocatore di 10 punti
        drawHealthBars();    // Aggiorna la barra della vita
    }
}




function update() {
    if (!player || !cursors) return;

    // Reset dell'accelerazione
    let targetVelocityX = 0;
    let targetVelocityY = 0;

    // Calcola la velocità target in base all'input del joystick o della tastiera
    if (dragging) {
        if (joystick && joystickBase) {  // Aggiunta di questa riga
            let dx = joystick.x - joystickBase.x;
            let dy = joystick.y - joystickBase.y;
            targetVelocityX = dx * acceleration;
            targetVelocityY = dy * acceleration;
        }
    } else {
        if (cursors.left.isDown) targetVelocityX = -maxSpeed;
        else if (cursors.right.isDown) targetVelocityX = maxSpeed;
        if (cursors.up.isDown) targetVelocityY = -maxSpeed;
        else if (cursors.down.isDown) targetVelocityY = maxSpeed;
    }
    if (this.input.keyboard.checkDown(cursors.space, 500)) {
        this.bulletManager.fireBullet(player, velocity);
    }
    // Aggiorna la velocità e la posizione del giocatore con un effetto di smorzamento
    velocity.x = Math.max(Math.min(velocity.x, maxSpeed), -maxSpeed);
    velocity.y = Math.max(Math.min(velocity.y, maxSpeed), -maxSpeed);
    velocity.x = velocity.x * damping + targetVelocityX * (1 - damping);
    velocity.y = velocity.y * damping + targetVelocityY * (1 - damping);
    player.x += velocity.x;
    player.y += velocity.y;

    // Limita la posizione del giocatore all'interno della scena
    player.x = Math.min(Math.max(player.x, 0), 1280);
    player.y = Math.min(Math.max(player.y, 0), 720);

    this.bulletManager.update();
    drawHealthBars();

    // Invia la posizione del giocatore al server
    sendPosition(player.x, player.y);
    sendGameState.bind(this)();
    }



function requestMatchmaking() {
if (isWsOpen) {
    console.log('Sending matchmaking request');
    ws.send(JSON.stringify({ type: 'matchmaking', id: playerId }));
}
}

function receiveData(event) {
let data = JSON.parse(event.data);
if (data.type === 'matchFound') {
    currentMatchId = data.matchId;
    playerRole = data.player; 
    this.searchingText.setText('Avversario trovato! Inizio partita...');
    console.log('Partita trovata! ID della partita:', currentMatchId);

    // Potresti voler rimuovere il messaggio dopo un breve ritardo e iniziare la partita
    this.time.delayedCall(2000, function() {
        this.searchingText.destroy();
        // Qui potrebbe iniziare la logica del gioco
    }, [], this);
} else if (data.type === 'updatePlayers') {
    
    // Gestione degli altri giocatori 

    for (const [id, position] of Object.entries(data.players)) {
        if (id !== playerId) {
            if (!otherPlayers[id]) {
                otherPlayers[id] = this.physics.add.image(position.x, position.y, 'ball');
console.log('Creating other player image at', position.x, position.y);
                otherPlayers[id].setCircle(50);
                otherPlayers[id].setScale(0.4);
            } else {
                otherPlayers[id].x = position.x;
                otherPlayers[id].y = position.y;

            }
        } 
    }

} else if (data.type === 'updateGameState') {
    if (data.id !== playerId) {
        otherPlayerHealth = data.health;
        drawHealthBars();  // Aggiorna le barre della salute
        this.bulletManager.updateOtherPlayerBullets(data.bullets);  // Assumiamo che tu abbia una funzione updateOtherPlayerBullets() nel tuo BulletManager
    }
} else if (data.type === 'fireBullet') {
// Creare un nuovo proiettile nell'arena basandoti sui dati ricevuti
const bulletData = data.bullet;
const selectedBullet = "bullet1"; // Ad esempio, "bullet1", "bullet2", ecc.
const bulletGroupKey = 'bullets' + selectedBullet.charAt(selectedBullet.length - 1);
const bullet = this.bulletManager[bulletGroupKey].create(bulletData.x, bulletData.y, selectedBullet);
    bullet.setData("owner", "otherPlayer");
bullet.setVelocity(bulletData.velocity.x, bulletData.velocity.y);
bullet.setCircle(20);
bullet.setScale(0.5);
}
else if (data.type === 'playerDisconnected') {
console.log(`Player ${data.id} has disconnected`);

// Mostra un messaggio all'utente
const disconnectText = this.add.text(600, 100, 'Player Disconnected', { fill: '#fff' });

// Distruggi il giocatore disconnesso se esiste
if (otherPlayers[data.id]) {
    otherPlayers[data.id].destroy();
    delete otherPlayers[data.id];
}

// Qui potresti gestire la logica per terminare o resettare la partita
// Ad esempio, potresti ritornare al menu dopo un certo periodo di tempo
this.time.delayedCall(2000, function() {
    disconnectText.destroy();
    // Qui potrebbe iniziare la logica per ritornare al menu
}, [], this);
}

}


function sendGameState() {
    if (isWsOpen) {
        ws.send(JSON.stringify({
            type: 'updateGameState',
            id: playerId,
            position: { x: player.x, y: player.y },
            health: playerHealth,
            bullets: this.bulletManager.getBulletsData(),  // Assumiamo che tu abbia una funzione getBulletsData() nel tuo BulletManager
            matchId: currentMatchId
        }));
    } else {
        console.log("WebSocket is not open. Ready state: ", ws ? ws.readyState : 'WebSocket is not defined');
    }
    }




function sendPosition(x, y) {
if (isWsOpen) {
  ws.send(JSON.stringify({ type: 'updatePosition', id: playerId, position: { x: x, y: y }, matchId: currentMatchId }));
} else {
    console.log("WebSocket is not open. Ready state: ", ws ? ws.readyState : 'WebSocket is not defined');
}
}  


