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
			`INSERT INTO salas (codigo, cantidad_personas) VALUES ('${codigo}', ${cantidad_personas})`
		);
		res.json(results);
	} catch (err) {
		res.status(500).send(err);
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


io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
    socket.on('sendMessage', (message) => {
        if (!message || !message.text || !socket.request.session.room) {
            console.error('Mensaje o sala inválidos', message);

            return;
        }
       
        socket.to(socket.request.session.room).emit('receiveMessage', message);
    });

    socket.on('unirseSala', (data) => {
        const { codigoSala, nombreJugador } = data;
        socket.request.session.room = codigoSala;
        socket.request.session.username = nombreJugador;
        socket.join(codigoSala);
    
        const players = getPlayersInRoom(codigoSala);
        io.to(codigoSala).emit('playersInRoom', players); // Emitir lista actualizada
    });
    socket.on('getPlayersInRoom', (roomCode, callback) => {
        const players = getPlayersInRoom(roomCode); 
        callback(players); 
        io.to(roomCode).emit("playersInRoom", players); 
    });
    
    

    socket.on('disconnect', () => {
        const roomCode = socket.request.session.room;
        const playerName = socket.request.session.username;

        if (roomCode && playerName) {
            console.log(`${playerName} se ha desconectado de la sala ${roomCode}`);
            console.log(getPlayersInRoom(roomCode))
            io.to(roomCode).emit('nuevoUsuario', `${playerName} se ha desconectado.`);
        }
    });
});