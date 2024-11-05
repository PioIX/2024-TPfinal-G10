"use client";
import { useEffect, useState } from "react";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";
import styles from './page.module.css';

export default function Home() {
    const [palabras, setPalabras] = useState([]);
    const [palabrasSeleccionadas, setPalabrasSeleccionadas] = useState([]);
    const [palabraActual, setPalabraActual] = useState("");
    const [segundos, setSegundos] = useState(45);
    const [clearCanvas, setClearCanvas] = useState(false);
    const [message, setMessage] = useState("");
    const [canvasEnabled, setCanvasEnabled] = useState(false);
    const [points, setPoints] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    useEffect(() => {
        const fetchPalabras = async () => {
            try {
                const response = await fetch('http://localhost:4000/palabrasObtener');
                const data = await response.json();
                setPalabras(data);
                seleccionarTresPalabras(data);
            } catch (error) {
                console.error("Error al obtener palabras:", error);
            }
        };

        fetchPalabras();
    }, []);

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
        setMessage(""); // Limpiar mensaje al seleccionar nueva palabra
        iniciarTemporizador();
    };

    const iniciarTemporizador = () => {
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
        
        return intervalId;
    };

    const resetGame = () => {
        setClearCanvas(true);
        setTimeout(() => {
            setClearCanvas(false);
        }, 0);
        
        seleccionarTresPalabras(palabras);
        setPalabraActual("");
        setCanvasEnabled(false);
    };

    const handleCorrectGuess = () => {
        setMessage("¡Palabra correcta!");
        setPoints(points + 100);
        resetGame();
        setTimeout(() => {
            setMessage(""); // Limpiar el mensaje después de 2 segundos
        }, 1000);
    };

    const timerClass = segundos <= 10 ? styles.timerRed : styles.timerBlack;

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
            {message && (
                <div className={styles.messageBanner}>
                    {message}
                </div>
            )}

            <div className={styles.flexContainer}>
                <div className="pizarronContainer">
                    <PizarronCanvas clearCanvas={clearCanvas} disabled={!canvasEnabled} />
                    <h3>Points: {points}</h3>
                </div>
                <div className="chatContainer">
                    <Chat palabraActual={palabraActual} onCorrectGuess={handleCorrectGuess} />
                </div>
            </div>
        </main>
    );
}
