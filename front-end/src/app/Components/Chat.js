import React, { useEffect, useRef } from 'react';
import styles from './chat.module.css'; 

const Chat = () => {
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState("");
    const messageEndRef = useRef(null); 

    const sendMessage = () => {
        if (input.trim()) {
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: input, sender: 'user' }
            ]);
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
                    <div key={index} className={`${styles.message} ${msg.sender === 'user' ? styles.userMessage : styles.botMessage}`}>
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
