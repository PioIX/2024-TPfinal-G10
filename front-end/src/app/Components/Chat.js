import React, { useEffect, useRef, useState } from "react";
import styles from './Chat.module.css';

export default function Chat({ palabraActual, onCorrectGuess, socket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const messageEndRef = useRef(null);
    const [username, setUsername] = useState(""); // Agregado para obtener el nombre desde la URL

    useEffect(() => {
        // Extraer el username desde los parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const playerName = urlParams.get('username');
        
        if (playerName) {
            setUsername(playerName); // Establecer el nombre del jugador desde el parámetro URL
        } else {
            setUsername("Usuario desconocido"); // Valor por defecto si no se encuentra el nombre
        }
    }, []); // Se ejecuta una sola vez cuando el componente se monta

    useEffect(() => {
        if (!socket) return;

        socket.on('receiveMessage', (message) => {
            setMessages((prevMessages) => [
                ...prevMessages,
                message
            ]);
        });

        return () => {
            socket.off('receiveMessage');
        };
    }, [socket]);

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

            return differences <= 1; 
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
                responseMessage = { text: "¡Palabra correcta! Has ganado 100 puntos.", sender: 'bot', className: styles.correctMessage  };
                onCorrectGuess(username);  // Pasar el nombre del jugador que adivinó correctamente

            } else if (isCasi(normalizedInput, normalizedPalabra)) {
                responseMessage = { text: "Casi, sigue intentando.", sender: 'bot', className: styles.casiMessage };
            }

            const newMessage = { text: `${username}: ${input}`, sender: 'user' };

            // Emitir mensaje al servidor
            socket.emit('sendMessage', newMessage);

            setMessages((prevMessages) => [
                ...prevMessages,
                newMessage,
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
            <h4>Points: {100}</h4>
        </div>
    );
}
