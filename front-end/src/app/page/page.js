"use client";
import { useEffect, useState } from "react";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";

export default function Home() {
    const [palabras, setPalabras] = useState([]);
    const [palabraActual, setPalabraActual] = useState("");
    const [segundos, setSegundos] = useState(45); 

    useEffect(() => {
        const fetchPalabras = async () => {
            try {
                const response = await fetch('http://localhost:4000/palabrasObtener');
                const data = await response.json();
                console.log(data); 
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
                            const nuevaPalabra = palabras[randomIndex]?.palabra || ""; 
                            console.log("Palabra seleccionada:", nuevaPalabra); 
                            return nuevaPalabra;
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
        <main className="flex min-h-screen flex-col items-center p-12">
            <div className="mt-8">
                <h2 className="text-2xl font-bold">Palabra actual:</h2>
                <p className="text-lg">{palabraActual}</p>
                <h3 className="text-lg">{segundos} segundos</h3>
            </div>

            <h1 className="text-4xl font-bold mb-8">Pizarron</h1>
            <div className="flex">
                <PizarronCanvas />
                <Chat />
            </div>

        </main>
    );
}
