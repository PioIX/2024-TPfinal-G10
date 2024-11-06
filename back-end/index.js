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
    sessionMiddleware(socket.request, {}, next);
});

// Obtener salas
app.get('/entrarSala', async (req, res) => {
    try {
        const results = await db.query('SELECT * FROM salas');
        res.json(results);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get('/ultimoNombre', async (req, res) => {
	try {
	  const results = await db.query('SELECT nombre FROM nombres ORDER BY id DESC LIMIT 1');
	  res.json(results[0]);  
	} catch (err) {
	  res.status(500).send(err);
	}
  });

  
// Crear nueva sala
app.post('/crearSala', async (req, res) => {
    const { codigo, cantidad_personas } = req.body;
    try {
        const results = await db.query(
            `INSERT INTO salas (codigo, cantidad_personas) VALUES ('${codigo}', ${cantidad_personas})`
        );
        res.json(results);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Guardar nombre de jugador
app.post('/guardarNombre', async (req, res) => {
    const { nombre } = req.body;
    try {
        const results = await db.query(
            `INSERT INTO nombres (nombre) VALUES ('${nombre}')`
        );
        res.status(201).json(results);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Obtener las palabras
app.get('/palabrasObtener', async (req, res) => {
    try {
        const results = await db.query('SELECT * FROM palabras2');
        res.json(results);
    } catch (err) {
        res.status(500).send(err);
    }
});

io.on('connection', (socket) => {
    socket.on('unirseSala', (codigoSala, nombreJugador) => {
        socket.request.session.room = codigoSala;
        socket.request.session.username = nombreJugador;
        socket.join(codigoSala);
        console.log(`${nombreJugador} se unió a la sala ${codigoSala}`);

    
        io.to(codigoSala).emit('nuevoUsuario', `${nombreJugador} se ha unido a la sala ${codigoSala}`);


        socket.to(codigoSala).emit('actualizarJugadores', { room: codigoSala, players: getPlayersInRoom(codigoSala) });
    });

    function getPlayersInRoom(roomCode) {
        const clients = io.sockets.adapter.rooms.get(roomCode);
        return Array.from(clients || []).map(socketId => io.sockets.sockets.get(socketId).request.session.username);
    }


    socket.on('iniciarJuego', (codigoSala, palabra, tiempo) => {
        io.to(codigoSala).emit('iniciarJuego', { palabra, tiempo });
    });

    socket.on('draw', (data) => {
        io.to(data.roomCode).emit('draw', data.drawingData);
    });

    socket.on('sendMessage', (data) => {
		console.log("anda")
        io.to(data.roomCode).emit('newMessage', { message: data.message, sender: data.sender });
    });

    
    socket.on('disconnect', () => {
        const roomCode = socket.request.session.room;
        const playerName = socket.request.session.username;

        if (roomCode && playerName) {
            
            io.to(roomCode).emit('nuevoUsuario', `${playerName} se ha desconectado`);

            
            io.to(roomCode).emit('actualizarJugadores', { room: roomCode, players: getPlayersInRoom(roomCode) });
        }
    });
});
