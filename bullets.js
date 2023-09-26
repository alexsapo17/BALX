// bullets.js

export class BulletManager {
    constructor(scene) {
        this.scene = scene;
        this.bullets1 = this.scene.physics.add.group();
        this.bullets2 = this.scene.physics.add.group();
        this.bullets3 = this.scene.physics.add.group();
        this.bullets4 = this.scene.physics.add.group();
        this.bullets5 = this.scene.physics.add.group();
        this.lastShotTime = 0;
        this.shotCooldown = 1000; // Cooldown time in milliseconds
        this.blueTrail = this.scene.add.particles('blue'); // Assumendo che 'blue' sia un colore o una texture valida
    this.redTrail = this.scene.add.particles('red');  // Assumendo che 'red' sia un colore o una texture valida
}
    // Function to fire a bullet
    fireBullet(player, velocity, isWsOpen, ws, currentMatchId) {
        const selectedBullet = localStorage.getItem('selectedBullet') || 'bullet1'; // Utilizza 'bullet1' come default

        let currentTime = this.scene.time.now;
        if (currentTime - this.lastShotTime < this.shotCooldown) {
            return;
        }
        this.lastShotTime = currentTime;
           // For now, we'll use the direction based on player velocity for simplicity
           let angle = Math.atan2(velocity.y, velocity.x);
        let offset = 30;  // Sposta il proiettile di 30 pixel dalla posizione del giocatore
        let startX = player.x + Math.cos(angle) * offset;
        let startY = player.y + Math.sin(angle) * offset;
    
        
        
        let bulletGroup = this['bullets' + selectedBullet.charAt(selectedBullet.length-1)];
        let bullet = bulletGroup.create(startX, startY, selectedBullet);
        bullet.setData("owner", player);
        bullet.setCircle(20); 
        bullet.setScale(0.5);


        // Set bullet properties based on the selected type
        if (selectedBullet === 'bullet2') {
            bullet.setCollideWorldBounds(true);
            bullet.setBounce(1, 1);
            this.scene.time.delayedCall(3000, () => {
                bullet.destroy();
            });
        } else if (selectedBullet === 'bullet3') {
            this.scene.physics.moveToObject(bullet, player === player1 ? player2 : player1, 350);
        } else if (selectedBullet === 'bullet4') {
            bullet.setCollideWorldBounds(true);
            bullet.setBounce(1, 1);
            this.scene.time.delayedCall(3000, () => {
                for (let i = 0; i < 4; i++) {
                    let newBullet = this.bullets1.create(bullet.x, bullet.y, 'bullet1');
                    newBullet.setData("owner", player);
                    this.scene.physics.velocityFromAngle(angle + i * 90, 350, newBullet.body.velocity);
                }
                bullet.destroy();
            });
        } else if (selectedBullet === 'bullet5') {
            // Logic for bullet5 (You can add your own implementation here)
        }
        
        bullet.setVelocityX(Math.cos(angle) * 400);
        bullet.setVelocityY(Math.sin(angle) * 400);
        if (isWsOpen) {
            ws.send(JSON.stringify({
                type: 'fireBullet',
                bullet: {
                    x: bullet.x,
                    y: bullet.y,
                    type: selectedBullet, // Ad esempio, "bullet1", "bullet2", ecc.
                    velocity: {
                        x: bullet.body.velocity.x,
                        y: bullet.body.velocity.y
                    },
                },
                matchId: currentMatchId
            }));
        }
        let bulletTrail = player.getData("owner") === "otherPlayer" ? this.redTrail : this.blueTrail;

let emitter = bulletTrail.createEmitter({
    speed: 100,
    scale: { start: 0.5, end: 0 },
    blendMode: 'ADD',
    lifespan: 200, // Durata in ms
});

emitter.startFollow(bullet);

        
    }

    // Function to update bullets (if needed)
    update() {
        // Logic to update bullets

        
        this.bullets1.getChildren().forEach(this.destroyOutOfBoundsBullet);
        this.bullets2.getChildren().forEach(this.destroyOutOfBoundsBullet);
        this.bullets3.getChildren().forEach(this.destroyOutOfBoundsBullet);
        this.bullets4.getChildren().forEach(this.destroyOutOfBoundsBullet);
        this.bullets5.getChildren().forEach(this.destroyOutOfBoundsBullet);
    }

    destroyOutOfBoundsBullet(bullet) {
        if (bullet.x < 0 || bullet.x > 1280 || bullet.y < 0 || bullet.y > 720) {
            if (bullet.emitter) {
                bullet.emitter.stop();
            }
            bullet.destroy();
        }
    }
    updateOtherPlayerBullets(otherPlayerBulletsData) {
        if (!otherPlayerBulletsData) return;
        ['bullets1', 'bullets2', 'bullets3', 'bullets4', 'bullets5'].forEach((groupName, index) => {
            const currentGroup = this[groupName];
            const otherPlayerBullets = otherPlayerBulletsData.filter(bullet => bullet.type == index + 1);
    
            // Aggiorna o crea nuovi proiettili per ogni gruppo
            otherPlayerBullets.forEach((bulletData, i) => {
                let bullet = currentGroup.getChildren()[i];
                if (!bullet) {
                    bullet = currentGroup.create(bulletData.x, bulletData.y, 'bullet' + (index + 1));
console.log('Creating bullet for other player at', bulletData.x, bulletData.y);
                    bullet.setData("owner", "otherPlayer");
                    bullet.setCircle(20);
                    bullet.setScale(0.5);
                    bullet.body.immovable = true; 
                    bullet.body.moves = false;
                } else {
                    bullet.x = bulletData.x;
                    bullet.y = bulletData.y;
                    bullet.body.velocity.x = bulletData.velocity.x;
                    bullet.body.velocity.y = bulletData.velocity.y;
                }
            });

            let emitter = this.redTrail.createEmitter({
                speed: 100,
                scale: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                lifespan: 200,
            });
            
            emitter.startFollow(bullet);
            
            // Rimuovi i proiettili in eccesso
            for (let i = otherPlayerBullets.length; i < currentGroup.getChildren().length; i++) {
                currentGroup.getChildren()[i].destroy();
            }
        });
    }
    
    getBulletsData() {
        let bulletsData = [];
        ['bullets1', 'bullets2', 'bullets3', 'bullets4', 'bullets5'].forEach(groupName => {
            this[groupName].getChildren().forEach(bullet => {
                bulletsData.push({
                    x: bullet.x,
                    y: bullet.y,
                    type: groupName.slice(-1) // estrae il numero del bullet dal nome del gruppo
                });
            });
        });
        return bulletsData;
}
}