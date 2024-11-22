"use client";
import { useEffect, useState, useRef } from "react";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";
import styles from "./page.module.css";
import { useSocket } from "../hooks/useSocket";

export default function Home() {
    const [palabras, setPalabras] = useState([]);
    const [palabrasSeleccionadas, setPalabrasSeleccionadas] = useState([]);
    const [palabraActual, setPalabraActual] = useState("");
    const [segundos, setSegundos] = useState(60);
    const [clearCanvas, setClearCanvas] = useState(false);
    const [message, setMessage] = useState("");
    const [canvasEnabled, setCanvasEnabled] = useState(false);
    const [points, setPoints] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [usoPalabra, setUsoPalabra] = useState(0);
    const [canChangeBackground, setCanChangeBackground] = useState(false);
    const [numJugadores, setNumJugadores] = useState(0);
    const { socket, isConnected } = useSocket();
    const [room, setRoom] = useState("");
    const [username, setUsername] = useState("");
    const intervalRef = useRef(null);
    const [usuariosNombre, setUsuariosNombre] = useState([]);
    const [puntajes, setPuntajes] = useState({});
    const [turno, setTurno] = useState(1);
    const [dibujante, setDibujante] = useState("");
    const [jugadorActual, setJugadorActual] = useState("");
    const [alreadyGuessed, setAlreadyGuessed] = useState(false);
    const [turnoParam, setTurnoParam] = useState(new URLSearchParams(window.location.search).get('turno'))

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get('room');
        if (socket && room) {
            socket.on("playersInRoom", (players) => {
                setNumJugadores(players.length);
                setUsuariosNombre(players);
                if (turnoParam == 1)
                    setDibujante(username)
                else
                    setDibujante(players.find((player) => player != username))
            });
            socket.emit('getPlayersInRoom', room, (players) => {
                setNumJugadores(players.length);
                setUsuariosNombre(players);
            });
        }

        return () => {
            socket?.off("playersInRoom");
        };
    }, [socket]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const playerName = urlParams.get('username');
        const roomCode = urlParams.get('room');

        if (playerName) {
            setUsername(playerName);
        }

        if (roomCode) {
            setRoom(roomCode);
        }
    }, []);

    useEffect(() => {
        const apiUrl = "http://localhost:4000";

        fetch(`${apiUrl}/palabrasObtener`)
            .then((response) => response.json())
            .then((data) => {
                setPalabras(data);
                seleccionarTresPalabras(data);
            })
            .catch((error) => {
                console.error("Error al obtener las palabras:", error);
            });
    }, []);



    useEffect(() => {
        if (!socket || !username) return;

        if (room && username) {
            socket.emit("unirseSala", { codigoSala: room, nombreJugador: username });
        }
    }, [socket, username, room]);

    const seleccionarTresPalabras = async (data) => {
        if (!data || data.length < 3) {
            console.warn("No hay suficientes palabras para seleccionar. Intentando obtener más...");

            try {
                const apiUrl = "http://localhost:4000";
                const response = await fetch(`${apiUrl}/palabrasObtener`);

                if (!response.ok) {
                    throw new Error(`Error al obtener las palabras: ${response.status}`);
                }

                const fetchedData = await response.json();

                if (fetchedData.length < 3) {
                    console.error("La API no devolvió suficientes palabras.");
                    setPalabras([]);
                    setPalabrasSeleccionadas([]);
                    return;
                }

                setPalabras(fetchedData);
                return seleccionarTresPalabras(fetchedData);
            } catch (error) {
                console.error("Error al intentar obtener palabras desde la API:", error.message);
                setPalabras([]);
                setPalabrasSeleccionadas([]);
                return;
            }
        }

        const seleccionadas = new Set();
        while (seleccionadas.size < 3) {
            const randomIndex = Math.floor(Math.random() * data.length);
            seleccionadas.add(data[randomIndex].palabra);
        }

        setPalabrasSeleccionadas([...seleccionadas]);
    };





    const finalizarTurno = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);  
            setTimerActive(false);
        }

        const currentIndex = usuariosNombre.indexOf(dibujante);
        const nextIndex = (currentIndex + 1) % usuariosNombre.length;
        const siguienteDibujante = usuariosNombre[nextIndex];

        socket.emit("cambiarTurno", { sala: room, nuevoDibujante: siguienteDibujante });  
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('updateScores', (scores) => {
            console.log('Puntajes actualizados:', scores);
            setPuntajes(scores); 
        });

        return () => socket.off('updateScores');
    }, [socket]);

    useEffect(() => {
        if (dibujante === username) {
            seleccionarTresPalabras(palabras);
        }
    }, [dibujante, palabras, username]);

    useEffect(() => {
        if (!socket) return;

        socket.on("cambiarTurno", ({ nuevoDibujante }) => {
            setDibujante(nuevoDibujante);
            setCanvasEnabled(nuevoDibujante === username); 
            resetGame(); 
        });

        return () => socket.off("cambiarTurno");
    }, [socket, username]);

    const manejarSeleccionPalabra = (palabra) => {
        if (dibujante !== username) return;
        setPalabraActual(palabra);
        socket.emit('seleccionarPalabra', { room, palabra });
        setCanvasEnabled(true);
        setCanChangeBackground(true);
        setMessage("");
        setUsoPalabra((prev) => prev + 1);
        setAlreadyGuessed(false);
        iniciarTemporizador();
    };

    useEffect(() => {
        console.log("Dibujante actual:", dibujante);
        console.log("Usuario actual:", username);
    }, [dibujante, username]);


    const iniciarTemporizador = () => {
        if (timerActive) {
            clearInterval(intervalRef.current);  
        }

        setSegundos(60); 
        setTimerActive(true);

        const intervalId = setInterval(() => {
            setSegundos((prev) => {
                if (prev <= 1) {  
                    clearInterval(intervalId);  
                    setSegundos(0);

                    setTimerActive(false);
                    finalizarTurno();  
                    return 0;  
                }
                return prev - 1;  
            });
        }, 1000);

        intervalRef.current = intervalId; 
    };

    useEffect(() => {
        console.log("Dibujante actual:", dibujante);
        console.log("Usuarios en la sala:", usuariosNombre);
    }, [dibujante, usuariosNombre]);


    const resetGame = () => {
        setClearCanvas(true);
        setTimeout(() => setClearCanvas(false), 0);

        setPalabraActual("");
        setCanvasEnabled(false);
        setTimerActive(false);
        setCanChangeBackground(false);
        setUsoPalabra(0);
        seleccionarTresPalabras(palabras);
        setSegundos(60);
    };
    useEffect(() => {
        if (!socket) return;

        socket.on('reiniciarCronometro', () => {
            setSegundos(0);
        });

        return () => {
            socket.off('reiniciarCronometro');
        };
    }, [socket]);


    const handleCorrectGuess = () => {
        if (alreadyGuessed) return; 
        setAlreadyGuessed(true); 

        setPoints((prevPoints) => {
            const newPoints = prevPoints + 100;

            setPuntajes((prevPuntajes) => ({
                ...prevPuntajes,
                [username]: (prevPuntajes[username] || 0) + 100,
            }));

            return newPoints;
        });

        setMessage("¡Palabra correcta!");
        resetGame();

        setTimeout(() => setMessage(""), 1000);
    };


    const timerClass = segundos <= 10 ? styles.timerRed : styles.timerBlack;

    useEffect(() => {
        if (usoPalabra === 2) {
            setSegundos(0);
            setMessage("Se rompió el cronómetro!");
            resetGame();
        }
    }, [usoPalabra]);



    return (
        <main className={styles.container}>
            <div className={styles.wordSection}>
                {palabraActual ? (
                    <>
                        <p className={styles.word}>{palabraActual}</p>
                        {timerActive && <h3 className={timerClass}>{segundos} segundos</h3>}
                    </>
                ) : (
                    <div className={styles.seleccionPalabra}>
                        {dibujante === username ? (
                            <h3 className={styles.word2}>Selecciona una palabra:</h3>
                        ) : (
                            <h3></h3>
                        )}
                        {dibujante === username ? (
                            palabrasSeleccionadas.length > 0 ? (
                                palabrasSeleccionadas.map((palabra, index) => (
                                    <div key={index}>
                                        <button onClick={() => manejarSeleccionPalabra(palabra)}>
                                            {palabra}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p>No hay palabras disponibles para seleccionar.</p>
                            )
                        ) : (
                            <p>Espera tu turno para seleccionar una palabra.</p>
                        )}
                    </div>
                )}
            </div>
            {message && <div className={styles.messageBanner}>{message}</div>}

            <div className={styles.flexContainer}>
                <div className={styles.playersList}>
                    <h4>Usuarios en la sala:</h4>
                    <ul>
                        {usuariosNombre.length > 0 ? (
                            usuariosNombre.map((usuario, index) => {
                                const puntaje = puntajes[usuario] || 0;

                                return (
                                    <li key={index}>
                                        {usuario === username ? `${usuario} (vos)` : usuario}: {puntaje} puntos
                                    </li>
                                );
                            })
                        ) : (
                            <p>Cargando usuarios...</p>
                        )}
                    </ul>

                </div>

                <div className={styles.canvasContainer}>
                    <PizarronCanvas
                        clearCanvas={clearCanvas}
                        disabled={dibujante !== username}
                        canChangeBackground={dibujante === username && canChangeBackground}
                    />
                </div>

                <div className={styles.chatContainer}>
                    <Chat palabraActual={palabraActual} onCorrectGuess={handleCorrectGuess} socket={socket} />
                </div>
            </div>
        </main>
    );
}