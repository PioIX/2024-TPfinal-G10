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
    const [usoPalabra, setUsoPalabra] = useState(0);
    const [canChangeBackground, setCanChangeBackground] = useState(false);
    const [numJugadores, setNumJugadores] = useState(0);
    const { socket, isConnected } = useSocket();
    const [room, setRoom] = useState("");
    const [username, setUsername] = useState("");
    const intervalRef = useRef(null);
    const [usuariosNombre, setUsuariosNombre] = useState([]);

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
        setUsoPalabra((prev) => prev + 1);
        iniciarTemporizador();
    };

    const iniciarTemporizador = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setSegundos(60);
        intervalRef.current = setInterval(() => {
            setSegundos((prev) => {
                if (prev === 1) {
                    clearInterval(intervalRef.current);
                    resetGame();
                    setMessage("Se terminó el tiempo!");
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
        setMessage("¡Palabra correcta!");
        resetGame();
        setTimeout(() => {
            setMessage("");
        }, 2000);
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
        <>

            <main className={styles.container}>
                <div className={styles.wordSection}>
                    <p className={styles.hola}>Jugadores en la sala: {numJugadores}</p>
                    {palabraActual ? (
                        <>
                            <p className={styles.word}>{palabraActual}</p>
                            <h3 className={timerClass}>{segundos} segundos</h3>
                        </>
                    ) : (
                        <div className={styles.seleccionPalabra}>
                            <h3>Selecciona una palabra:</h3>
                            {palabrasSeleccionadas.length > 0 ? (
                                palabrasSeleccionadas.map((palabra, index) => (
                                    <button
                                        key={index}
                                        onClick={() => manejarSeleccionPalabra(palabra)}
                                        aria-label={`Seleccionar palabra: ${palabra}`}
                                    >
                                        {palabra}
                                    </button>
                                ))
                            ) : (
                                <p>Cargando palabras...</p>
                            )}
                        </div>
                    )}
                </div>
                {message && (
                    <div className={styles.messageBanner}>
                        {message}
                    </div>
                )}
                <div className={styles.flexContainer}>
                    <div className={styles.playersList}>
                        <h4>Usuarios en la sala:</h4>
                        <ul>
                            {usuariosNombre.length > 0 ? (
                                (() => {
                                    const nameCounts = {};
                                    const processedNames = {};
                                    usuariosNombre.forEach((usuario) => {
                                        nameCounts[usuario] = (nameCounts[usuario] || 0) + 1;
                                    });
                                    return usuariosNombre.map((usuario, index) => {
                                        processedNames[usuario] = (processedNames[usuario] || 0) + 1;
                                        const occurrence = processedNames[usuario];
                                        let displayName = nameCounts[usuario] > 1
                                            ? `${usuario} (${occurrence})`
                                            : usuario;
                                        if (usuario === username && occurrence === 1) {
                                            displayName = `${displayName} (vos)`;
                                        }

                                        return <li key={`${usuario}-${occurrence}`}>{displayName}</li>;
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
                    </div>
                    <div className={styles.chatContainer}>
                        <Chat palabraActual={palabraActual} onCorrectGuess={handleCorrectGuess} socket={socket} />
                    </div>
                </div>

            </main>
        </>
    );
}
