"use client";
import { useEffect, useState } from "react";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";
import styles from './page.module.css'; // Asegúrate de crear este archivo

export default function Home() {
    const [palabras, setPalabras] = useState([]);
    const [palabraActual, setPalabraActual] = useState("");
    const [segundos, setSegundos] = useState(45);

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
                    setPalabraActual(() => {
                        if (palabras.length > 0) {
                            const randomIndex = Math.floor(Math.random() * palabras.length);
                            return palabras[randomIndex]?.palabra || "";
                        }
                        return "";
                    });
                    return 45;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [palabras]);

    return (
        <main className={styles.container}>
            <div className={styles.wordSection}>
                <p className={styles.word}>{palabraActual}</p>
                <h3 className={styles.timer}>{segundos} segundos</h3>
            </div>
            <div className={styles.flexContainer}>
                <PizarronCanvas />
                <Chat />
            </div>
        </main>
    );
}
