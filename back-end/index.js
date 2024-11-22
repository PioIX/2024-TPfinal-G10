const express = require('express');
const bodyParser = require('body-parser');
const db = require('./modulos/mysql');
const session = require('express-session');
var cors = require('cors');
const app = express();


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());


const LISTEN_PORT = 4000;
const server = app.listen(LISTEN_PORT, () => {
    console.log(`Servidor NodeJS corriendo en http://localhost:${LISTEN_PORT}/`);
});


const io = require('socket.io')(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://10.1.5.150:3000"], 
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});


const sessionMiddleware = session({
    secret: "ositos",  
    resave: false,
    saveUninitialized: false
});

app.use(sessionMiddleware);


io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

app.get('/entrarSala', async (req, res) => {
	try {
		const results = await db.query('SELECT * FROM salas');
		res.json(results);
	} catch (err) {
		res.status(500).send(err);
	}
});

io.on('connection', (socket) => {
    socket.on('unirseSala', (codigoSala) => {
        socket.join(codigoSala);
        socket.to(codigoSala).emit('nuevoUsuario', 'Un nuevo usuario se ha unido a la sala: ' + codigoSala);
    });
});


app.post('/crearSala', async (req, res) => { 
	const { codigo, cantidad_personas } = req.body;
	try {
		const results = await db.query(
			`INSERT INTO salas (codigo, cantidad_personas, turno) VALUES ('${codigo}', ${cantidad_personas}, 1)`
		);
		res.json(results);
	} catch (err) {
		res.status(500).send(err);
	}
});



app.post('/updateTurno', async (req, res) => {
    const { codigo } = req.body;

    try {
        const [result] = await db.query('SELECT turno FROM salas WHERE codigo = ?', [codigo]);

        if (result.length === 0) {
            return res.status(404).send({ error: 'Sala no encontrada' });
        }
        let turnoActual = result[0].turno;


        let nuevoTurno = turnoActual === 1 ? 2 : 1;

        await db.query('UPDATE salas SET turno = ? WHERE codigo = ?', [nuevoTurno, codigo]);

        res.json({ nuevoTurno });
    } catch (err) {
        res.status(500).send({ error: 'Error al actualizar el turno', details: err });
    }
});



app.post('/sendMessage', async (req, res) => {
	const { chatId, message, sender } = req.body;
  
	try {
	  await pool.query(
		`INSERT INTO messages (chat_id, message_text, sender, timestamp) 
		 VALUES ($1, $2, $3, NOW())`,
		[chatId, message, sender]
	  );
	  await pool.query(
		`UPDATE chats SET message_text = $1 WHERE id = $2`,
		[message, chatId]
	  );
	  res.status(201).send('Mensaje enviado');
	} catch (error) {
	  res.status(500).send(error);
	}
  });

app.get('/chats', (req, res) => {
	const { chatId } = req.params;
	db.query('SELECT * FROM messages WHERE chat_id = ?', [chatId], (err, results) => {
		if (err) return res.status(500).send(err);
		res.json(results);
	});
});

app.get('/ultimoNombre', async (req, res) => {
    try {
        const results = await db.query('SELECT nombre FROM nombres ORDER BY id DESC LIMIT 1');
        res.json(results[0]);
    } catch (err) {
        res.status(500).send({ error: 'Error al obtener el último nombre', details: err });
    }
});

app.get('/palabrasObtener', async (req, res) => {
    try {
        const results = await db.query('SELECT * FROM palabras2');
        res.json(results);
    } catch (err) {
        res.status(500).send({ error: 'Error al obtener las palabras', details: err });
    }
});

app.get('/chats/:chatId', (req, res) => {
	const { chatId } = req.params;
	db.query('SELECT * FROM messages WHERE chat_id = ?', [chatId], (err, results) => {
	  if (err) return res.status(500).send(err);
	  res.json(results);  
	});
  });

app.post('/chats', (req, res) => {
	const { chatId, sender, text } = req.body;
	db.query(
	  'INSERT INTO messages (chat_id, sender, text) VALUES (?, ?, ?)',
	  [chatId, sender, text],
	  (err, results) => {
		if (err) {
		  return res.status(500).send(err);
		}
		res.status(201).json({ id: results.insertId, chatId, sender, text });
	  }
	);
  });

app.post('/cualquierCosa', async (req, res) => {
    const phoneNumber = req.body.number;

    try {
        const results = await db.query(`SELECT phone_number FROM users WHERE phone_number = ${phoneNumber}`);
        const exists = results.length > 0; 
        res.send(results);
    } catch (error) {
        res.status(500).send(error);
    }
});

function getPlayersInRoom(roomCode) {
    const clients = io.sockets.adapter.rooms.get(roomCode);
    return Array.from(clients || []).map(socketId => {
        return io.sockets.sockets.get(socketId).request.session.username;
    });
}
const manejarAdivinanza = (palabraAdivinada) => {

    if (palabraAdivinada === palabraCorrecta) {
        setMessage("¡Palabra adivinada correctamente!");
        setSegundos(0); 
        clearInterval(intervalRef.current);  
        setTimerActive(false);  
        finalizarTurno(); 
    }
};
const turnOrder = {};
let palabraActual = "";  
const playerScores = {}; 

io.on('connection', (socket) => { 
    console.log('Nuevo cliente conectado:', socket.id);

    socket.on('sendMessage', (message) => {
        if (!message || !message.text || !socket.request.session.room) {
            console.error('Mensaje o sala inválidos', message, socket.request.session.room);
            return;
        }

        const room = socket.request.session.room;
        const playerName = socket.request.session.username;

        const textoMensaje = message.text.split(': ')[1] || ''; 
        
        if (textoMensaje.toLowerCase() === palabraActual.toLowerCase()) {
            console.log("Palabra correcta: ", textoMensaje);
            
          
            if (!playerScores[room]) playerScores[room] = {};
            if (!playerScores[room][playerName]) playerScores[room][playerName] = 0;

            playerScores[room][playerName] += 100;

          
            socket.emit('receiveMessage', { 
                text: `¡Palabra correcta! Has ganado 100 puntos. Total: ${playerScores[room][playerName]} puntos.`,
                sender: 'bot' 
            });

           
            io.to(room).emit('reiniciarCronometro');

            io.to(room).emit('updateScores', playerScores[room]);
        } else {
            console.log("Palabra incorrecta: ", textoMensaje);
        }

        socket.to(room).emit('receiveMessage', message);
    });

    socket.on('unirseSala', (data) => {
        const { codigoSala, nombreJugador } = data;

        if (!codigoSala || !nombreJugador) {
            console.error('Datos de sala o jugador inválidos');
            return;
        }

        socket.request.session.room = codigoSala;
        socket.request.session.username = nombreJugador;
        socket.join(codigoSala);

        if (!playerScores[codigoSala]) playerScores[codigoSala] = {};
        if (!playerScores[codigoSala][nombreJugador]) playerScores[codigoSala][nombreJugador] = 0;

        io.to(codigoSala).emit('playersInRoom', Object.keys(playerScores[codigoSala]));
        io.to(codigoSala).emit('updateScores', playerScores[codigoSala]);

        console.log(`${nombreJugador} se ha unido a la sala ${codigoSala}`);
    });
    socket.on("palabraAdivinada", (palabraAdivinada) => {
        manejarAdivinanza(palabraAdivinada);
    });
    
    socket.on('seleccionarPalabra', ({ room, palabra }) => {
        console.log(`Palabra seleccionada para la sala ${room}: ${palabra}`);
        palabraActual = palabra;
        io.to(room).emit('palabraActual', palabra); 
    });
    socket.on("cambiarTurno", ({ sala, nuevoDibujante }) => {
        io.to(sala).emit("cambiarTurno", { nuevoDibujante });
        io.emit("clearCanvas");
    });
    
    socket.on('unirseSala', (data) => {
        const { codigoSala, nombreJugador } = data;
        socket.request.session.room = codigoSala;
        socket.request.session.username = nombreJugador;
        socket.join(codigoSala);
    
        const playersInRoom = getPlayersInRoom(codigoSala);
        const playerTurn = playersInRoom.length;
        turnOrder[codigoSala] = turnOrder[codigoSala] || {};
        turnOrder[codigoSala][nombreJugador] = playerTurn;

        const players = getPlayersInRoom(codigoSala);
        io.to(codigoSala).emit('playersInRoom', players);

        socket.emit('turnoAsignado', playerTurn);
        console.log(`${nombreJugador} se ha unido a la sala ${codigoSala} con turno: ${playerTurn}`);
        
    });
    socket.on('getPlayersInRoom', (roomCode, callback) => {
        const players = getPlayersInRoom(roomCode); 
        callback(players); 
        io.to(roomCode).emit("playersInRoom", players); 
    });
    socket.on('finalizarTurno', ({ username }) => {
        const room = socket.request.session.room;
        const players = getPlayersInRoom(room);
        
        const currentIndex = players.indexOf(username);
        const nextIndex = (currentIndex + 1) % players.length;
        const siguienteJugador = players[nextIndex];
        
        io.to(room).emit('cambiarTurno', { nuevoDibujante: siguienteJugador });
    });
    

    socket.on('disconnect', () => {
        const roomCode = socket.request.session.room;
        const playerName = socket.request.session.username;

        if (roomCode && playerName) {
            console.log(`${playerName} se ha desconectado de la sala ${roomCode}`);
            console.log(getPlayersInRoom(roomCode))
            delete turnOrder[roomCode][playerName];
            io.to(roomCode).emit('nuevoUsuario', `${playerName} se ha desconectado.`);

        }
    });
});


io.on("connection", (socket) => {
    console.log("Nuevo usuario conectado:", socket.id);

    socket.on("saveCanvas", (canvasData) => {
        socket.broadcast.emit("receiveCanvas", canvasData);
    });
    

    socket.on("disconnect", () => {
        console.log("Usuario desconectado:", socket.id);
    });
});

let puntajes = {};

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
    socket.emit('actualizarPuntajes', puntajes);
    socket.on('sumarPuntos', ({ username, puntos }) => {
        if (!puntajes[username]) {
            puntajes[username] = 0;
        }
        puntajes[username] += puntos;
        io.emit('actualizarPuntajes', puntajes);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});
