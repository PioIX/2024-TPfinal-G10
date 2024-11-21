import React, { useEffect, useRef, useState } from "react";
import styles from './Chat.module.css';
import { useSocket } from "../hooks/useSocket";

export default function Chat({ palabraActual, onCorrectGuess, socket }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const messageEndRef = useRef(null);
    const [username, setUsername] = useState("");
    const [points, setPoints] = useState(0); // Puntos del jugador

    // Establecer el nombre del jugador desde la URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const playerName = urlParams.get('username');
        
        if (playerName) {
            setUsername(playerName); 
        } else {
            setUsername("Usuario desconocido"); 
        }
    }, []); 

    // Suscribir al evento 'receiveMessage' para recibir mensajes del servidor
    useEffect(() => {
        if (!socket) return;

        socket.on('receiveMessage', (message) => {
            console.log('Mensaje recibido del servidor:', message);
            
            // Si el mensaje incluye "¡Palabra correcta!", se suman los puntos
            if (message.text.includes("¡Palabra correcta!")) {
                setPoints(prevPoints => prevPoints + 100); // Actualizar puntos en caso de respuesta correcta
            }
            
            // Agregar el mensaje recibido a la lista de mensajes
            setMessages((prevMessages) => [
                ...prevMessages,
                message
            ]);
        });

        return () => {
            socket.off('receiveMessage');
        };
    }, [socket]);

    // Función para normalizar el texto (sin acentos y en minúsculas)
    const normalizeString = (str) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    // Verifica si el input está "casi" correcto comparado con la palabra
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

    // Enviar mensaje al servidor
    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim()) {
            const normalizedInput = normalizeString(input.trim());
            const normalizedPalabra = normalizeString(palabraActual);
            let responseMessage = null;
    
            if (normalizedInput === normalizedPalabra) {
                responseMessage = { text: "¡Palabra correcta! Has ganado 100 puntos.", sender: 'bot', className: styles.correctMessage };
                onCorrectGuess(username);  // Notificar al componente principal sobre la adivinanza correcta
            } else if (isCasi(normalizedInput, normalizedPalabra)) {
                responseMessage = { text: "Casi, sigue intentando.", sender: 'bot', className: styles.casiMessage };
            }
    
            // Crear el mensaje que incluye el nombre de usuario y el mensaje
            const newMessage = { text: `${username}: ${input}`, sender: 'user' };
    
            // Emitir el mensaje al servidor
            socket.emit('sendMessage', newMessage, palabraActual);  // Enviar el mensaje junto con la palabra actual
    
            setMessages((prevMessages) => [
                ...prevMessages,
                newMessage,
                responseMessage && responseMessage
            ].filter(Boolean));
    
            setInput("");  // Limpiar el campo de entrada
        }
    };

    // Desplazar el scroll hasta el último mensaje
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
            <h4>Puntos: {points}</h4> 
        </div>
    );
}
