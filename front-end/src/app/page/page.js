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
        /*
        if (turnoParam == 1) {
            setDibujante(playerName);  
        } else {
            const rival = usuariosNombre.map(usuario => {
                console.log(usuario);
            })
            console.log("Mi rival es: ",rival)
            setDibujante(rival);
        }
          */  
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
        if (turno !== turnoParam) {
        
            return;
        }
        setPalabraActual(palabra);
        setCanvasEnabled(true);
        setCanChangeBackground(true);
        setMessage("");
        setUsoPalabra((prev) => prev + 1);
        iniciarTemporizador();
    };

    const iniciarTemporizador = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        setSegundos(60);
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
        
        //VERIFICAR!!!!!
        if (dibujante == username) {
            setDibujante(players.find((player) => player != username))
        } else {
            setDibujante(username);
        }
        // ---------
    };
    

    const handleCorrectGuess = (jugador) => {
        setMessage("¡Palabra correcta!");
        setPoints((prevPoints) => prevPoints + 100);

        resetGame();
        setTimeout(() => {
            setMessage("");
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
            <p>{dibujante}</p>
            <div className={styles.wordSection}>
                {palabraActual ? (
                    <>
                        <p className={styles.word}>{palabraActual}</p>
                        {timerActive && <h3 className={timerClass}>{segundos} segundos</h3>}
                    </>
                ) : (
                    <div className={styles.seleccionPalabra}>
                        <h3>Selecciona una palabra:</h3>
                        {dibujante === username ? (
                            palabrasSeleccionadas.map((palabra, index) => (
                                <button key={index} onClick={() => manejarSeleccionPalabra(palabra)}>
                                    {palabra}
                                </button>
                            ))
                        ) : (
                            <p>Espera tu turno para seleccionar una palabra.</p>
                        )}
                        <h3>Points: {points}</h3>
                    </div>
                )}
            </div>
            {message && <div className={styles.messageBanner}>{message}</div>}

            <div className={styles.flexContainer}>
                <div className={styles.playersList}>
                    <h4>Usuarios en la sala:</h4>
                    <div>
                        {dibujante === username ? (
                            <h3>Es tu turno, {username}. ¡Dibuja!</h3>
                        ) : (
                            <h3>espera...</h3>
                        )}
                    </div>
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

                                    const puntaje = puntajes[usuario] || 0;
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
                        disabled={turno !== turnoParam}  
                        canChangeBackground={dibujante === username && canChangeBackground}
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
