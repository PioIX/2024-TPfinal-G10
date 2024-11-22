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
        origin: ["http://localhost:3000", "http://localhost:3001"], 
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
    // Si la palabra es correcta, detener el cronómetro inmediatamente.
    if (palabraAdivinada === palabraCorrecta) {
        setMessage("¡Palabra adivinada correctamente!");
        setSegundos(0);  // Detenemos el cronómetro inmediatamente.
        clearInterval(intervalRef.current);  // Limpiar el intervalo.
        setTimerActive(false);  // Desactivamos el temporizador.
        finalizarTurno();  // Cambiar el turno de inmediato.
    }
};
const turnOrder = {};
let palabraActual = "";  
const playerScores = {}; // Estructura: { sala1: { jugador1: 100, jugador2: 50 }, sala2: { ... } }

io.on('connection', (socket) => { 
    console.log('Nuevo cliente conectado:', socket.id);

    // Evento para manejar mensajes
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
            
            // Incrementar puntos del jugador
            if (!playerScores[room]) playerScores[room] = {};
            if (!playerScores[room][playerName]) playerScores[room][playerName] = 0;

            playerScores[room][playerName] += 100;

            // Emitir mensaje al jugador que acertó
            socket.emit('receiveMessage', { 
                text: `¡Palabra correcta! Has ganado 100 puntos. Total: ${playerScores[room][playerName]} puntos.`,
                sender: 'bot' 
            });

            // Reiniciar el cronómetro y avisar a la sala
            io.to(room).emit('reiniciarCronometro');

            // Enviar puntajes actualizados a todos en la sala
            io.to(room).emit('updateScores', playerScores[room]);
        } else {
            console.log("Palabra incorrecta: ", textoMensaje);

            socket.emit('receiveMessage', { 
                text: "Casi, sigue intentando.", 
                sender: 'bot' 
            });
        }

        // Reenviar el mensaje al resto de la sala
        socket.to(room).emit('receiveMessage', message);
    });

    // Evento para unirse a una sala
    socket.on('unirseSala', (data) => {
        const { codigoSala, nombreJugador } = data;

        if (!codigoSala || !nombreJugador) {
            console.error('Datos de sala o jugador inválidos');
            return;
        }

        socket.request.session.room = codigoSala;
        socket.request.session.username = nombreJugador;
        socket.join(codigoSala);

        // Inicializar puntaje del jugador en la sala si no existe
        if (!playerScores[codigoSala]) playerScores[codigoSala] = {};
        if (!playerScores[codigoSala][nombreJugador]) playerScores[codigoSala][nombreJugador] = 0;

        // Avisar a la sala sobre el nuevo jugador
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
        
        // Encontrar el próximo jugador en la lista de jugadores
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

/* io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    socket.on('guardarDibujo', (data) => {
        const room = socket.request.session.room;
        if (room) {
            socket.to(room).emit('canvasUpdated', data); // Enviar el dibujo al resto de la sala
        }
    });

    socket.on('unirseSala', (data) => {
        const { codigoSala, nombreJugador } = data;
        socket.request.session.room = codigoSala;
        socket.join(codigoSala);
        console.log(`${nombreJugador} se ha unido a la sala ${codigoSala}`);
    });

    socket.on('disconnect', () => {
        console.log('Un cliente se ha desconectado');
    });
});
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    // Manejar la unión a una sala
    socket.on('unirseSala', ({ codigoSala, nombreJugador }) => {
        if (!codigoSala) {
            console.error("El código de la sala es requerido");
            return;
        }
        socket.join(codigoSala); // Unir al socket a la sala
        socket.request.session.room = codigoSala;
        socket.request.session.username = nombreJugador;

        console.log(`${nombreJugador} se ha unido a la sala ${codigoSala}`);
        socket.to(codigoSala).emit('nuevoUsuario', `${nombreJugador} se ha unido a la sala`);
    });

    // Manejar el evento de guardar dibujo
    socket.on('guardarDibujo', (data) => {
        const room = socket.request.session.room;
        if (!room) {
            console.error("El usuario no está en ninguna sala");
            return;
        }
        console.log(`Guardando dibujo en la sala ${room}`);
        socket.to(room).emit('canvasUpdated', data); // Emitir el dibujo al resto de usuarios en la sala
    });

    // Manejar desconexiones
    socket.on('disconnect', () => {
        const roomCode = socket.request.session.room;
        const playerName = socket.request.session.username;
        if (roomCode && playerName) {
            console.log(`${playerName} se ha desconectado de la sala ${roomCode}`);
            socket.to(roomCode).emit('usuarioDesconectado', `${playerName} se ha desconectado.`);
        }
    });
}); */


io.on("connection", (socket) => {
    console.log("Nuevo usuario conectado:", socket.id);

    // Escuchar cuando un usuario guarda el lienzo y retransmitirlo a los demás
    socket.on("saveCanvas", (canvasData) => {
        // Enviar canvasData (incluye acciones y backgroundColor) a todos los demás clientes
        socket.broadcast.emit("receiveCanvas", canvasData);
    });
    

    socket.on("disconnect", () => {
        console.log("Usuario desconectado:", socket.id);
    });
});

// Estado global para almacenar puntajes
let puntajes = {};

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    // Enviar puntajes actuales al nuevo cliente
    socket.emit('actualizarPuntajes', puntajes);

    // Escuchar el evento 'sumarPuntos' cuando un usuario adivina correctamente
    socket.on('sumarPuntos', ({ username, puntos }) => {
        if (!puntajes[username]) {
            puntajes[username] = 0;
        }
        puntajes[username] += puntos;

        // Emitir los puntajes actualizados a todos los clientes
        io.emit('actualizarPuntajes', puntajes);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});
