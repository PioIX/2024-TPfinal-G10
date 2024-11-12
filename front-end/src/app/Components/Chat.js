import React, { useEffect, useRef, useState } from 'react';
import styles from './chat.module.css';

const Chat = ({ palabraActual, onCorrectGuess }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const messageEndRef = useRef(null);

    const normalizeString = (str) => {
        return str
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    };

    const isCasi = (input, actual) => {
        const normalizedInput = normalizeString(input);
        const normalizedActual = normalizeString(actual);
        
        // Verifica si el input tiene la misma longitud que la palabra actual o una letra menos
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

    const sendMessage = () => {
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

            setMessages((prevMessages) => [
                ...prevMessages,
                { text: input, sender: 'user' },
                responseMessage && responseMessage
            ].filter(Boolean));

            setInput("");
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    useEffect(() => {
        if (messageEndRef.current) {
            messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    return (
        <div className={styles.chatContainer}>
            <div className={styles.messageList}>
                {messages.map((msg, index) => (
                    <div key={index} className={`${styles.message} ${msg.sender === 'user' ? styles.userMessage : msg.className}`}>
                        {msg.text}
                    </div>
                ))}
                <div ref={messageEndRef} />
            </div>
            <div className={styles.inputContainer}>
                <input
                    type="text"
                    className={styles.inputField}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Escribe un mensaje..."
                />
                <button className={styles.sendButton} onClick={sendMessage}>Enviar</button>
            </div>
        </div>
    );
};

export default Chat;
