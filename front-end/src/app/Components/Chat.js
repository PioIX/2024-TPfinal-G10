import React from 'react';
import styles from './chat.module.css'; // Asegúrate de que el archivo CSS esté vinculado

const Chat = () => {
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState("");

    const sendMessage = () => {
        if (input.trim()) {
            setMessages((prevMessages) => [
                ...prevMessages,
                { text: input, sender: 'user' }
            ]);
            setInput(""); 
        }
    };

    return (
        <div className={styles.chatContainer}>
            <div className={styles.messageList}>
                {messages.map((msg, index) => (
                    <div key={index} className={`${styles.message} ${msg.sender === 'user' ? styles.userMessage : styles.botMessage}`}>
                        {msg.text}
                    </div>
                ))}
            </div>
            <div className={styles.inputContainer}>
                <input
                    type="text"
                    className={styles.inputField}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                />
                <button className={styles.sendButton} onClick={sendMessage}>Enviar</button>
            </div>
        </div>
    );
};

export default Chat;
