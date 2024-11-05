"use client";
import { useEffect, useState } from "react";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";
import styles from "./page.module.css";

export default function Home() {
    const [palabras, setPalabras] = useState([]);
    const [palabrasSeleccionadas, setPalabrasSeleccionadas] = useState([]);
    const [palabraActual, setPalabraActual] = useState("");
    const [segundos, setSegundos] = useState(60);
    const [clearCanvas, setClearCanvas] = useState(false);
    const [message, setMessage] = useState("");
    const [canvasEnabled, setCanvasEnabled] = useState(false);
    const [usoPalabra, setUsoPalabra] = useState(0);
    const [canChangeBackground, setCanChangeBackground] = useState(false); // Permitir cambiar el fondo
    const [intervalId, setIntervalId] = useState(null);

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
        setCanChangeBackground(true); // Permitir cambiar el fondo
        setUsoPalabra((prev) => prev + 1);
        iniciarTemporizador();
    };

    const iniciarTemporizador = () => {
        if (intervalId) {
            clearInterval(intervalId);
        }

        setSegundos(60);
        const newIntervalId = setInterval(() => {
            setSegundos((prev) => {
                if (prev === 1) {
                    clearInterval(newIntervalId);
                    resetGame();
                    setMessage("Se terminó el tiempo!");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        setIntervalId(newIntervalId);
    };

    const resetGame = () => {
        setClearCanvas(true);
        setTimeout(() => {
            setClearCanvas(false);
        }, 0);

        seleccionarTresPalabras(palabras);
        setPalabraActual("");
        setCanvasEnabled(false);
        setCanChangeBackground(false); // Desactivar cambio de fondo
        setUsoPalabra(0);

        if (intervalId) {
            clearInterval(intervalId);
            setIntervalId(null);
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

    useEffect(() => {
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [intervalId]);

    return (
        <main className={styles.container}>
            <div className={styles.wordSection}>
                {palabraActual ? (
                    <>
                        <p className={styles.word}>{palabraActual}</p>
                        <h3 className={timerClass}>{segundos} segundos</h3>
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
            </div>
            {message && (
                <div className={styles.messageBanner}>
                    {message}
                </div>
            )}

            <div className={styles.flexContainer}>
                <div className="pizarronContainer">
                    <PizarronCanvas 
                        clearCanvas={clearCanvas} 
                        disabled={!canvasEnabled} 
                        canChangeBackground={canChangeBackground} 
                    />
                </div>
                <div className="chatContainer">
                    <Chat palabraActual={palabraActual} onCorrectGuess={handleCorrectGuess} />
                </div>
            </div>
        </main>
    );
}
