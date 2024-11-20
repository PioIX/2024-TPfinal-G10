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
    const [points, setPoints] = useState(0); // Puntos de este jugador
    const [timerActive, setTimerActive] = useState(false);
    const [usoPalabra, setUsoPalabra] = useState(0);
    const [canChangeBackground, setCanChangeBackground] = useState(false);
    const [numJugadores, setNumJugadores] = useState(0);
    const { socket } = useSocket();
    const [room, setRoom] = useState("");
    const [username, setUsername] = useState("");
    const intervalRef = useRef(null);
    const [usuariosNombre, setUsuariosNombre] = useState([]);
    const [puntajes, setPuntajes] = useState({});
    const [alreadyGuessed, setAlreadyGuessed] = useState(false); // Evitar duplicar el conteo

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get("room");
        if (socket && room) {
            socket.on("playersInRoom", (players) => {
                setNumJugadores(players.length);
                setUsuariosNombre(players);

                // Inicializar puntajes en 0 para todos los usuarios
                const initialScores = {};
                players.forEach((player) => {
                    initialScores[player] = 0;
                });
                setPuntajes(initialScores);
            });

            socket.emit("getPlayersInRoom", room, (players) => {
                setNumJugadores(players.length);
                setUsuariosNombre(players);

                // Inicializar puntajes en 0 para todos los usuarios
                const initialScores = {};
                players.forEach((player) => {
                    initialScores[player] = 0;
                });
                setPuntajes(initialScores);
            });
        }

        return () => {
            socket?.off("playersInRoom");
        };
    }, [socket]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const playerName = urlParams.get("username");
        const roomCode = urlParams.get("room");

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

    const seleccionarTresPalabras = (data) => {
        const seleccionadas = [];
        while (seleccionadas.length < 3) {
            const randomIndex = Math.floor(Math.random() * data.length);
            const palabra = data[randomIndex].palabra;
            if (!seleccionadas.includes(palabra)) {
                seleccionadas.push(palabra);
            }
        }
        setPalabrasSeleccionadas(seleccionadas);
    };

    const manejarSeleccionPalabra = (palabra) => {
        setPalabraActual(palabra);
        setCanvasEnabled(true);
        setCanChangeBackground(true);
        setMessage("");
        setUsoPalabra((prev) => prev + 1);
        setAlreadyGuessed(false); // Resetear bloqueo al seleccionar nueva palabra
        iniciarTemporizador();
    };

    const iniciarTemporizador = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setSegundos(45);
        setTimerActive(true);
        const intervalId = setInterval(() => {
            setSegundos((prev) => {
                if (prev === 1) {
                    clearInterval(intervalId);
                    setMessage("Se terminó el tiempo!");
                    setTimerActive(false);
                    resetGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const resetGame = () => {
        setClearCanvas(true);
        setTimeout(() => {
            setClearCanvas(false);
        }, 0);

        seleccionarTresPalabras(palabras);
        setPalabraActual("");
        setCanvasEnabled(false);
        setCanChangeBackground(false);
        setUsoPalabra(0);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    const handleCorrectGuess = () => {
        if (alreadyGuessed) return; // Si ya adivinó, no hacer nada
        setAlreadyGuessed(true); // Evitar duplicaciones
    
        // Actualizar puntajes globales solo
        setPuntajes((prevPuntajes) => ({
            ...prevPuntajes,
            [username]: (prevPuntajes[username] || 0) + 100,
        }));
    
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

    useEffect(() => {
        if (!socket) return;

        socket.on("updateScores", (newScores) => {
            setPuntajes(newScores);
        });

        return () => {
            socket.off("updateScores");
        };
    }, [socket]);

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
                        <h3>Selecciona una palabra:</h3>
                        {palabrasSeleccionadas.map((palabra, index) => (
                            <button key={index} onClick={() => manejarSeleccionPalabra(palabra)}>
                                {palabra}
                            </button>
                        ))}
                    </div>
                )}
                <div className={styles.pointsContainer}>
                    <h3>Puntos acumulados: {points}</h3>
                </div>
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
                        disabled={!canvasEnabled}
                        canChangeBackground={canChangeBackground}
                    />
                </div>

                <div className={styles.chatContainer}>
                    <Chat palabraActual={palabraActual} onCorrectGuess={handleCorrectGuess} socket={socket} />
                </div>
            </div>
        </main>
    );
}
