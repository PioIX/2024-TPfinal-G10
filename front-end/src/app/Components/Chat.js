"use client"; 
import React, { useEffect, useRef, useState } from "react";
import styles from './Chat.module.css'; // Importar el archivo CSS

export default function Chat({ palabraActual, onCorrectGuess }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [lastUserName, setLastUserName] = useState(""); // Estado para el último nombre de usuario
    const messageEndRef = useRef(null);

    // Obtener el último nombre guardado al montar el componente
    useEffect(() => {
        const fetchLastUserName = async () => {
            try {
                const response = await fetch('http://localhost:4000/ultimoNombre');
                const data = await response.json();
                if (data && data.nombre) {
                    setLastUserName(data.nombre);
                } else {
                    console.warn('No se encontró un nombre en la respuesta');
                }
            } catch (err) {
                console.error('Error fetching last user name:', err);
            }
        };

        fetchLastUserName();
    }, []);

    const normalizeString = (str) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    const isCasi = (input, actual) => {
        const normalizedInput = normalizeString(input);
        const normalizedActual = normalizeString(actual);
        
        if (normalizedInput.length === normalizedActual.length || normalizedInput.length + 1 === normalizedActual.length) {
            const inputSet = new Set(normalizedInput);
            const actualSet = new Set(normalizedActual);
            let differences = 0;

            for (let letter of actualSet) {
                if (!inputSet.has(letter)) {
                    differences++;
                }
            }

            return differences <= 1; // Permitir hasta una letra diferente
        }
        return false;
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim()) {
            const normalizedInput = normalizeString(input.trim());
            const normalizedPalabra = normalizeString(palabraActual);
            let responseMessage = null;

            if (normalizedInput === normalizedPalabra) {
                responseMessage = { text: "palabra correcta", sender: 'bot', className: styles.correctMessage };
                onCorrectGuess();
            } else if (isCasi(normalizedInput, normalizedPalabra)) {
                responseMessage = { text: "casi", sender: 'bot', className: styles.casiMessage };
            }

            const newMessage = `${localStorage.getItem("username")}: ${input}`;
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: newMessage, sender: 'user' },
                responseMessage && responseMessage
            ].filter(Boolean));

            setInput("");
        }
    };

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className={styles.chatContainer}>
            <h2 className="text-lg font-bold mb-2">Chat</h2>
            <div className={styles.messageList}>
                {messages.map((msg, index) => (
                    <div key={index} className={`${styles.message} ${msg.sender === 'user' ? styles.userMessage : msg.className}`}>
                        {msg.text}
                    </div>
                ))}
                <div ref={messageEndRef} />
            </div>
            <form onSubmit={sendMessage} className={styles.inputContainer}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className={styles.inputField}
                    placeholder="Escribe un mensaje..."
                />
                <button type="submit" className={styles.sendButton}>
                    Enviar
                </button>
            </form>
        </div>
    );
}
