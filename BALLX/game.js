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
            gravity: { y: 0 }
        }
    },
    scene: [MenuScene, GameScene]  // Ora includiamo entrambe le scene
};

let game = new Phaser.Game(config);
let player;
let otherPlayers = {};
let ws;
let playerId = Math.random().toString(36).substr(2, 9);  // ID univoco per il giocatore
let joystickBase;
let joystick;
let dragging = false;
let cursors;  // Aggiunto per gestire gli input da tastiera
let isWsOpen = false;
let currentMatchId = null;
let playerRole = null; 
let playerHealth = 100;
let otherPlayerHealth = 100;
let playerHealthBar;
let otherPlayerHealthBar;
let bulletsType1;
let bulletsType2;
let bulletsType3;
let bulletsType4;
let bulletsType5;
let currentDirection = 0;  // 0 = su, 90 = destra, 180 = giù, 270 = sinistra
let gameContext;


function preload() {
    this.load.image('ball', 'images/ball.png');
    this.load.image('bulletType1', 'images/bullet1.png');
    this.load.image('bulletType2', 'images/bullet2.png');
    this.load.image('bulletType3', 'images/bullet3.png');
    this.load.image('bulletType4', 'images/bullet4.png');
    this.load.image('bulletType5', 'images/bullet5.png');
}

function create() {
    for (const id in otherPlayers) {
        otherPlayers[id].destroy();
    }
    otherPlayers = {};


    if (playerRole === 'Player 1') {
        player = this.add.image(200, 360, 'ball');  // Posizione per il Player 1
    } else {
        player = this.add.image(1080, 360, 'ball');  // Posizione per il Player 2
    }

    cursors = this.input.keyboard.createCursorKeys();
    gameContext = this;

    ws = new WebSocket('ws://192.168.1.40:8080');
    ws.addEventListener('message', receiveData.bind(this));


    ws.addEventListener('close', function(event) {
        console.log("WebSocket is closed now.");
    });

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
    this.input.on('touchstart', function(pointer) {
        let touchX = pointer.x;
        let touchY = pointer.y;
        let angle = Phaser.Math.Angle.Between(player.x, player.y, touchX, touchY);
        fireBullet(player.x, player.y, angle, "type1");
    }, this);
    
    // Codice per il joystick
    this.input.on('pointerdown', function (pointer) {
        if (pointer.x < config.width / 2) {
            if (joystickBase) joystickBase.destroy();
            if (joystick) joystick.destroy();
    
            joystickBase = this.add.circle(pointer.x, pointer.y, 50, 0x888888, 0.5);
            joystick = this.add.circle(pointer.x, pointer.y, 20, 0xFFFFFF, 0.7);
            dragging = true;
        }
    }, this);
    
    this.input.on('pointermove', function (pointer) {
        if (dragging && pointer.x < config.width / 2) {
            joystick.x = pointer.x;
            joystick.y = pointer.y;
        }
    }, this);
    
    
    this.input.on('pointerup', function (pointer) {
        if (dragging && pointer.x < config.width / 2) {
            if (joystickBase) joystickBase.destroy();
            if (joystick) joystick.destroy();
            dragging = false;
        }
    }, this);

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

        function createHealthBars() {
            playerHealthBar = this.add.graphics();
            otherPlayerHealthBar = this.add.graphics();
            drawHealthBars();
        }

        bulletsType1 = this.physics.add.group({
            classType: Bullet,
            // altre opzioni
        });
    
        bulletsType2 = this.physics.add.group({
            classType: Bullet,
            // altre opzioni
        });

        bulletsType3 = this.physics.add.group({
            classType: Bullet,
            // altre opzioni
        });

        bulletsType4 = this.physics.add.group({
            classType: Bullet,
            // altre opzioni
        });

        bulletsType5 = this.physics.add.group({
            classType: Bullet,
            // altre opzioni
        });
    
        this.physics.add.collider(player, bulletsType1, hitPlayer1, null, this);
        this.physics.add.collider(player, bulletsType2, hitPlayer1, null, this);
        this.physics.add.collider(player, bulletsType3, hitPlayer1, null, this);
        this.physics.add.collider(player, bulletsType4, hitPlayer1, null, this);
        this.physics.add.collider(player, bulletsType5, hitPlayer1, null, this);

        let shootArea = this.add.zone(config.width / 2, 0, config.width / 2, config.height).setInteractive();
        shootArea.on('pointerdown', (pointer) => {
            let angle = Phaser.Math.Angle.Between(player.x, player.y, pointer.x, pointer.y);
            fireBullet(player.x, player.y, angle, "type1");
        });


    }



    function hitPlayer1(player, bullet) {
        if (bullet.getData("owner") !== player) {
            bullet.setActive(false).setVisible(false);
            bullet.destroy();
            
            if (!playerShieldActive) {  // Supponendo che tu abbia una variabile simile
                playerHealth -= 10;
                drawHealthBars();
                if (playerHealth <= 0) {
                    addCoins(10);  // Aggiorna questa funzione come nel tuo vecchio codice
                    player.destroy();
                    gameOver("Player 2 Wins");  // Aggiorna questa funzione come nel tuo vecchio codice
                }
            } else {
                bullet.setActive(false).setVisible(false);
            }
            
            let explosion = this.add.circle(player.x, player.y, 10, 0xff0000);
            // Fai espandere e scomparire il cerchio
            this.tweens.add({
                targets: explosion,
                radius: { from: 10, to: 40 },
                alpha: { from: 1, to: 0 },
                duration: 300,
                onComplete: function () {
                    explosion.destroy();
                }
            });
        }
    }
    
    function hitPlayer2(otherPlayer, bullet) {
        if (bullet.getData("owner") !== otherPlayer) {
            bullet.setActive(false).setVisible(false);
            otherPlayerHealth -= 10;
            bullet.destroy();
            drawHealthBars();
            
            if (otherPlayerHealth <= 0) {
                addCoins(100);  // Aggiorna questa funzione come nel tuo vecchio codice
                otherPlayer.destroy();
                gameOver("Player 1 Wins");  // Aggiorna questa funzione come nel tuo vecchio codice
            }
            
            let explosion = this.add.circle(player.x, player.y, 10, 0xff0000);

            // Fai espandere e scomparire il cerchio
            this.tweens.add({
                targets: explosion,
                radius: { from: 10, to: 40 },
                alpha: { from: 1, to: 0 },
                duration: 300,
                onComplete: function () {
                    explosion.destroy();
                }
            });
        }
    }
    
    function drawHealthBars() {
        playerHealthBar.clear();
        playerHealthBar.fillStyle(0x00FF00);
        playerHealthBar.fillRect(10, 10, playerHealth, 10);
    
        otherPlayerHealthBar.clear();
        otherPlayerHealthBar.fillStyle(0x00FF00);
        otherPlayerHealthBar.fillRect(1260, 10, otherPlayerHealth, 10);  // Posizione aggiornata per il secondo giocatore
    }
   
    
    class Bullet extends Phaser.Physics.Arcade.Sprite {
        constructor(scene, x, y, texture) {
            super(scene, x, y, texture);
            scene.add.existing(this);
            scene.physics.add.existing(this);
            this.setActive(false);
            this.setVisible(false);
        }
    
        fire(angle) {
            this.setActive(true).setVisible(true);
            this.setAngle(angle);
            this.scene.physics.velocityFromAngle(angle, 600, this.body.velocity);
        }
    }
    

function update() {
    
    // Logica per muovere la pallina con le frecce della tastiera
    if (!player || !cursors) return;

    if (cursors.left.isDown) {
        player.x -= 5;
        currentDirection = 270;
    } else if (cursors.right.isDown) {
        player.x += 5;
        currentDirection = 90;
    }
    
    if (cursors.up.isDown) {
        player.y -= 5;
        currentDirection = 0;
    } else if (cursors.down.isDown) {
        player.y += 5;
        currentDirection = 180;
    }

    if (dragging) {
        let dx = joystick.x - joystickBase.x;
        let dy = joystick.y - joystickBase.y;
        player.x += dx * 0.1;
        player.y += dy * 0.1;

    }

    // All'interno della funzione update
if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE))) {
    fireBullet(player.x, player.y, currentDirection, "type1");
}

    sendPosition(player.x, player.y);

}

function fireBullet(x, y, angle, bulletType) {
    let bullet;
    if (bulletType === "type1") {
        bullet = bulletsType1.get(x, y);
    } else if (bulletType === "type2") {
        bullet = bulletsType2.get(x, y);
    } else if (bulletType === "type3") {
        bullet = bulletsType3.get(x, y);
    } else if (bulletType === "type4") {
        bullet = bulletsType4.get(x, y);
    } else if (bulletType === "type5") {
        bullet = bulletsType5.get(x, y);
    }

    let calculatedAngle = Phaser.Math.RadToDeg(angle) - 90; // Sottrai 90 gradi per allineare correttamente
    bullet.setAngle(calculatedAngle); // 

    if (bullet) {
        bullet.setActive(true).setVisible(true);  // Rendi il proiettile attivo e visibile
        bullet.setPosition(x, y);  // Posiziona il proiettile
        gameContext.physics.velocityFromAngle(angle, 600, bullet.body.velocity);  // Imposta la velocità e la direzione

        // Imposta il proprietario del proiettile, in modo da poter gestire le collisioni
        bullet.setData("owner", playerId);

        // Invia i dati al server solo se il WebSocket è aperto
        if (isWsOpen) {
            ws.send(JSON.stringify({
                type: 'fireBullet',
                id: playerId,
                position: { x: x, y: y },
                angle: angle,
                bulletType: bulletType,
                matchId: currentMatchId
            }));
        }
    }
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
        playerRole = data.player;  // Aggiungi questa linea
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
                    otherPlayers[id] = this.add.image(position.x, position.y, 'ball');
                } else {
                    otherPlayers[id].x = position.x;
                    otherPlayers[id].y = position.y;
                }
            }
        }
    }
    if (data.type === 'fireBullet' && data.id !== playerId) {
        let bullet;
        if (data.bulletType === "type1") bullet = bulletsType1.get(data.position.x, data.position.y);
        else if (data.bulletType === "type2") bullet = bulletsType2.get(data.position.x, data.position.y);
        else if (data.bulletType === "type3") bullet = bulletsType3.get(data.position.x, data.position.y);
        else if (data.bulletType === "type4") bullet = bulletsType4.get(data.position.x, data.position.y);
        else if (data.bulletType === "type5") bullet = bulletsType5.get(data.position.x, data.position.y);

        if (bullet) {
            bullet.fire(data.angle);
        }
    }
}

function sendGameState() {
    if (isWsOpen) {
        ws.send(JSON.stringify({
            type: 'updateGameState',
            id: playerId,
            position: { x: player.x, y: player.y },
            health: playerHealth,
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
