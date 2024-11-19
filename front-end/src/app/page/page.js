"use client";
import { useEffect, useState, useRef } from "react";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";
import styles from "./page.module.css";
import { useSocket } from "../hooks/useSocket";
import Head from "next/head";

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
    const [puntajes, setPuntajes] = useState({}); // Estado para puntajes

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const room = urlParams.get('room');
        if (socket && room) {
            socket.on("playersInRoom", (players) => {
                setNumJugadores(players.length);
                setUsuariosNombre(players);
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
        setMessage(""); // Limpiar mensaje al seleccionar nueva palabra
        setUsoPalabra((prev) => prev + 1);
        iniciarTemporizador();
    };

    const iniciarTemporizador = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setSegundos(45); // Cambié los segundos a 45 en vez de 60
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

    const handleCorrectGuess = (jugador) => {
        setMessage("¡Palabra correcta!");
        setPoints((prevPoints) => prevPoints + 100); // Sumar 100 puntos

        resetGame();
        setTimeout(() => {
            setMessage(""); // Limpiar el mensaje después de 2 segundos
        }, 1000);
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
                        <h3>Selecciona una palabra:</h3>
                        {palabrasSeleccionadas.map((palabra, index) => (
                            <button key={index} onClick={() => manejarSeleccionPalabra(palabra)}>
                                {palabra}
                            </button>
                        ))}
                        <h3>Points: {points}</h3>
                    </div>
                )}
            </div>
            {message && <div className={styles.messageBanner}>{message}</div>}

            <div className={styles.flexContainer}>
                <div className={styles.playersList}>
                    <h4>Usuarios en la sala:</h4>
                    <ul>
                        {usuariosNombre.length > 0 ? (
                            (() => {
                                const nameCounts = {};
                                const processedNames = {};
                                return usuariosNombre.map((usuario, index) => {
                                    processedNames[usuario] = (processedNames[usuario] || 0) + 1;
                                    const occurrence = processedNames[usuario];
                                    let displayName = nameCounts[usuario] > 1
                                        ? `${usuario} (${occurrence})`
                                        : usuario;
                                    if (usuario === username && occurrence === 1) {
                                        displayName = `${displayName} (vos)`;
                                    }

                                    // Mostrar nombre y puntaje
                                    const puntaje = puntajes[usuario] || 0;  // Si no tiene puntaje, muestra 0
                                    return (
                                        <li key={`${usuario}-${occurrence}`}>
                                            {displayName}: {puntaje} puntos
                                        </li>
                                    );
                                });
                            })()
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
                    <h3>Points: {points}</h3>
                </div>

                <div className={styles.chatContainer}>
                    <Chat palabraActual={palabraActual} onCorrectGuess={handleCorrectGuess} socket={socket} />
                </div>
            </div>
        </main>
    );
}
