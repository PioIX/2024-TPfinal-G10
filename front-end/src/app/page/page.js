"use client";
import { useEffect, useState } from "react";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";
import styles from './page.module.css';

export default function Home() {
    const [palabras, setPalabras] = useState([]);
    const [palabraActual, setPalabraActual] = useState("");
    const [segundos, setSegundos] = useState(45);
    const [clearCanvas, setClearCanvas] = useState(false);
    const [message, setMessage] = useState(""); // Cambia el estado a uno solo

    useEffect(() => {
        const fetchPalabras = async () => {
            try {
                const response = await fetch('http://localhost:4000/palabrasObtener');
                const data = await response.json();
                setPalabras(data);
                if (data.length > 0) {
                    const a = Math.floor(Math.random() * data.length);
                    setPalabraActual(data[a].palabra);
                }
            } catch (error) {
                console.error("Error al obtener palabras:", error);
            }
        };

        fetchPalabras();
    }, []);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setSegundos((prev) => {
                if (prev === 1) {
                    resetGame();
                    setMessage("Tiempo agotado!"); // Mensaje al acabar el tiempo
                    return 45;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [palabras]);

    const resetGame = () => {
        setClearCanvas(true);
        setTimeout(() => {
            setClearCanvas(false);
        }, 0);

        if (palabras.length > 0) {
            const randomIndex = Math.floor(Math.random() * palabras.length);
            setPalabraActual(palabras[randomIndex]?.palabra || "");
        }
        setSegundos(45);
        setMessage(""); // Reiniciar el mensaje
    };

    const handleCorrectGuess = () => {
        setMessage("¡Palabra correcta!"); // Mensaje al acertar
        resetGame();
        setTimeout(() => {
            setMessage(""); // Ocultar el mensaje después de 2 segundos
        }, 2000);
    };

    const timerClass = segundos <= 10 ? styles.timerRed : styles.timerBlack;

    return (
        <main className={styles.container}>
            <div className={styles.wordSection}>
                <p className={styles.word}>{palabraActual}</p>
                <h3 className={timerClass}>{segundos} segundos</h3>
            </div>
            {message && (
                <div className={styles.messageBanner}>
                    {message}
                </div>
            )}


            <div className={styles.flexContainer}>
                <div className="pizarronContainer">
                    <PizarronCanvas clearCanvas={clearCanvas} />
                </div>
                <div className="chatContainer">
                    <Chat palabraActual={palabraActual} onCorrectGuess={handleCorrectGuess} />
                </div>
            </div>
        </main>
    );
}
