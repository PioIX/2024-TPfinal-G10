const express = require('express');
const bodyParser = require('body-parser');
const db = require('./modulos/mysql');
const session = require('express-session');
var cors = require('cors')

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors())

const LISTEN_PORT = 4000;
const server = app.listen(LISTEN_PORT, () => {
	console.log(`Servidor NodeJS corriendo en http://localhost:${LISTEN_PORT}/`);
});;

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

// Obtener contactos
app.get('/entrarSala', async (req, res) => {
	try {
		const results = await db.query('SELECT * FROM salas');
		res.json(results);
	} catch (err) {
		res.status(500).send(err);
	}
});

app.get('/palabrasObtener', async (req, res) => {
	try {
		const results = await db.query('SELECT * FROM palabras2');
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

  
// Obtener mensajes
app.get('/chats', (req, res) => {
	const { chatId } = req.params;
	db.query('SELECT * FROM messages WHERE chat_id = ?', [chatId], (err, results) => {
		if (err) return res.status(500).send(err);
		res.json(results);
	});
});

app.get('/chats/:chatId', (req, res) => {
	const { chatId } = req.params;
	db.query('SELECT * FROM messages WHERE chat_id = ?', [chatId], (err, results) => {
	  if (err) return res.status(500).send(err);
	  res.json(results);  
	});
  });

// Enviar un nuevo mensaje
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

app.get('/', (req, res) => {
	console.log(`[REQUEST - ${req.method}] ${req.url}`);
});

app.post('/login', (req, res) => {
	console.log(`[REQUEST - ${req.method}] ${req.url}`);
});

app.delete('/login', (req, res) => {
	console.log(`[REQUEST - ${req.method}] ${req.url}`);
	res.send(null);
});

io.on("a", (socket) => {
	const req = socket.request;

	socket.on('joinRoom', data => {
		console.log("🚀 ~ io.on ~ req.session.room:", req.session.room)
		if (req.session.room != undefined && req.session.room.length > 0)
			socket.leave(req.session.room);
		req.session.room = data.room;
		socket.join(req.session.room);

		io.to(req.session.room).emit('chat-messages', { user: req.session.user, room: req.session.room });
	});

	socket.on('pingAll', data => {
		console.log("PING ALL: ", data);
		io.emit('pingAll', { event: "Ping to all", message: data });
	});

	socket.on('sendMessage', data => {
		io.to(req.session.room).emit('newMessage', { room: req.session.room, message: data });
	});

	socket.on('disconnect', () => {
		console.log("Disconnect");
	})
});