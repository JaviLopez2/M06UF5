const PORT = 7778;

let http = require('http');
let static = require('node-static');
let ws = require('ws');

let file = new static.Server('./public');

let http_server = http.createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
}).listen(PORT);

let ws_server = new ws.Server({server: http_server});

let player1 = null, player2 = null;
let spectators = [];
let gameStarted = false;

ws_server.on('connection', function (conn) {
    console.log("Usuario conectado");

    if (player1 == null) {
        player1 = conn;
        let info = { player_num: 1 };
        player1.send(JSON.stringify(info));
        player1.on('close', function () {
            console.log("Player 1 disconnected");
            player1 = null;
            gameStarted = false;
            if (player2) {
                player2.send(JSON.stringify({ type: 'player_disconnected', player_num: 1 }));
            }
            spectators.forEach(spectator => spectator.send(JSON.stringify({ type: 'player_disconnected', player_num: 1 })));
        });
	player1.on('message', function (msg) {
    	if (player2 == null || !gameStarted) return;
    	let info = JSON.parse(msg);
    	if (!info.sender) info.sender = 1;
    	if (info.y != null || info.by != null || info.ps1 != null || info.ps2 != null || info.game_over != null) {
        player2.send(JSON.stringify(info));
        spectators.forEach(spectator => spectator.send(JSON.stringify(info)));
    }
});
    } else if (player2 == null) {
        player2 = conn;
        let info = { player_num: 2 };
        player2.send(JSON.stringify(info));
        player2.on('close', function () {
            console.log("Player 2 disconnected");
            player2 = null;
            gameStarted = false;
            if (player1) {
                player1.send(JSON.stringify({ type: 'player_disconnected', player_num: 2 }));
            }
            spectators.forEach(spectator => spectator.send(JSON.stringify({ type: 'player_disconnected', player_num: 2 })));
        });
        player2.on('message', function (msg) {
            if (player1 == null || !gameStarted) return;
            let info = JSON.parse(msg);
            if (!info.sender) info.sender = 2;
            
            if (info.y != null) {
                player1.send(JSON.stringify(info));
                spectators.forEach(spectator => spectator.send(JSON.stringify(info)));
            }
        });

        if (player1 && player2) {
            startCountdown();
        }
    } else {
        spectators.push(conn);
        conn.on('close', function () {
            console.log("Spectator disconnected");
            spectators = spectators.filter(spectator => spectator !== conn);
        });
    }
});

function startCountdown() {
    let countdown = {
        type: 'countdown',
        message: '3'
    };
    player1.send(JSON.stringify(countdown));
    player2.send(JSON.stringify(countdown));
    spectators.forEach(spectator => spectator.send(JSON.stringify(countdown)));

    setTimeout(() => {
        countdown.message = '2';
        player1.send(JSON.stringify(countdown));
        player2.send(JSON.stringify(countdown));
        spectators.forEach(spectator => spectator.send(JSON.stringify(countdown)));
    }, 1000);

    setTimeout(() => {
        countdown.message = '1';
        player1.send(JSON.stringify(countdown));
        player2.send(JSON.stringify(countdown));
        spectators.forEach(spectator => spectator.send(JSON.stringify(countdown)));
    }, 2000);

    setTimeout(() => {
        countdown.message = 'Ya!';
        player1.send(JSON.stringify(countdown));
        player2.send(JSON.stringify(countdown));
        spectators.forEach(spectator => spectator.send(JSON.stringify(countdown)));
    }, 3000);

    setTimeout(() => {
        let start = {
            startGame: true
        };
        player1.send(JSON.stringify(start));
        player2.send(JSON.stringify(start));
        spectators.forEach(spectator => spectator.send(JSON.stringify(start)));
        gameStarted = true;
        
        let initialScore = {
            ps1: 0,
            ps2: 0
        };
        player1.send(JSON.stringify(initialScore));
        player2.send(JSON.stringify(initialScore));
        spectators.forEach(spec => spec.send(JSON.stringify(initialScore)));
    }, 4000);
}