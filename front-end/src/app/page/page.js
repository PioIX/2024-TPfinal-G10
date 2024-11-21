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
        if (!data || data.length < 3) {
            console.error("No hay suficientes palabras para seleccionar.");
            setPalabrasSeleccionadas([]);
            return;
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
        setPalabraActual(palabra);
        socket.emit('seleccionarPalabra', { room, palabra });
        setCanvasEnabled(true);
        setCanChangeBackground(true);
        setMessage("");
        setUsoPalabra((prev) => prev + 1);
        setAlreadyGuessed(false); 
        iniciarTemporizador();

    };

    const iniciarTemporizador = () => {
        if (timerActive) {
            clearInterval(intervalRef.current);
        }
    
        setSegundos(5);
        setTimerActive(true);
        const intervalId = setInterval(() => {
            setSegundos((prev) => {
                if (prev === 1) {
                    clearInterval(intervalId);
                    setMessage("Se terminó el tiempo!");
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
    

    const handleCorrectGuess = (jugador) => {
        if (!jugadorActual || jugadorActual !== jugador) return;
    
        setPuntajes((prevPuntajes) => ({
            ...prevPuntajes,
            [jugador]: (prevPuntajes[jugador] || 0) + 100,
        }));
        setMessage("¡Palabra correcta!");
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
                        disabled={dibujante !== username}
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