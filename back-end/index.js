const express = require('express');
const bodyParser = require('body-parser');
const db = require('./modulos/mysql');  // Asegúrate de que este archivo esté configurado correctamente
const session = require('express-session');
var cors = require('cors');
const app = express();

// Middleware para analizar las solicitudes HTTP
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

// Configurar el puerto en el que se ejecutará el servidor
const LISTEN_PORT = 4000;
const server = app.listen(LISTEN_PORT, () => {
    console.log(`Servidor NodeJS corriendo en http://localhost:${LISTEN_PORT}/`);
});

// Configuración de Socket.IO con CORS
const io = require('socket.io')(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001"],  // Permitir CORS desde el cliente React
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Middleware de sesión
const sessionMiddleware = session({
    secret: "ositos",  // Cambia esto por una clave más segura
    resave: false,
    saveUninitialized: false
});

app.use(sessionMiddleware);

// Usamos el middleware de sesión para las conexiones de socket
io.use((socket, next) => {
    sessionMiddleware(socket.request, socket.request.res || {}, next);
});

// Rutas para obtener información desde la base de datos
app.get('/entrarSala', async (req, res) => {
    try {
        const results = await db.query('SELECT * FROM salas');
        res.json(results);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Obtener el último nombre registrado en la base de datos
app.get('/ultimoNombre', async (req, res) => {
    try {
        const results = await db.query('SELECT nombre FROM nombres ORDER BY id DESC LIMIT 1');
        res.json(results[0]);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Crear una nueva sala
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

// Guardar el nombre de un jugador en la base de datos
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

// Obtener una lista de palabras desde la base de datos
app.get('/palabrasObtener', async (req, res) => {
    try {
        const results = await db.query('SELECT * FROM palabras2');
        res.json(results);
    } catch (err) {
        res.status(500).send(err);
    }
});

// Configuración de las conexiones de WebSocket
io.on('connection', (socket) => {
    socket.on('unirseSala', (data) => {
        // Asegúrate de que 'data' no sea nulo
        if (!data || !data.codigoSala || !data.nombreJugador) {
            console.error('Datos inválidos al intentar unirse a la sala', data);
            return;  // No procesar si los datos no son válidos
        }

        const { codigoSala, nombreJugador } = data;
        socket.request.session.room = codigoSala;
        socket.request.session.username = nombreJugador;
        socket.join(codigoSala);
        console.log(`${nombreJugador} se unió a la sala ${codigoSala}`);

        io.to(codigoSala).emit('nuevoUsuario', `${nombreJugador} se ha unido a la sala ${codigoSala}`);
        socket.to(codigoSala).emit('actualizarJugadores', { room: codigoSala, players: getPlayersInRoom(codigoSala) });
    });

    // Función para obtener la lista de jugadores en la sala
    function getPlayersInRoom(roomCode) {
        const clients = io.sockets.adapter.rooms.get(roomCode);
        return Array.from(clients || []).map(socketId => io.sockets.sockets.get(socketId).request.session.username);
    }

    // Iniciar el juego y emitir la palabra y el tiempo
    socket.on('iniciarJuego', (codigoSala, palabra, tiempo) => {
        io.to(codigoSala).emit('iniciarJuego', { palabra, tiempo });
    });

    // Enviar datos de dibujo al resto de los jugadores
    socket.on('draw', (data) => {
        io.to(data.roomCode).emit('draw', data.drawingData);
    });

    // Enviar mensajes a los jugadores
    socket.on('sendMessage', (data) => {
        console.log(data);
        io.to(data.roomCode).emit('newMessage', { message: data.message, sender: data.sender });
    });

    // Cuando un jugador se desconecta
    socket.on('disconnect', () => {
        const roomCode = socket.request.session.room;
        const playerName = socket.request.session.username;

        if (roomCode && playerName) {
            io.to(roomCode).emit('nuevoUsuario', `${playerName} se ha desconectado`);
            io.to(roomCode).emit('actualizarJugadores', { room: roomCode, players: getPlayersInRoom(roomCode) });
        }
    });
});
