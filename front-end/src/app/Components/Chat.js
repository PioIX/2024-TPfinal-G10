"use client";
import React, { useState } from "react";

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim()) {
            setMessages([...messages, input]);
            setInput("");
        }
    };

    return (
        <div className="flex flex-col border border-gray-300 p-4 w-80 h-full">
            <h2 className="text-lg font-bold mb-2">Chat</h2>
            <div className="flex-grow overflow-y-auto mb-2">
                {messages.map((msg, index) => (
                    <div key={index} className="p-1 border-b">
                        {msg}
                    </div>
                ))}
            </div>
            <form onSubmit={sendMessage} className="flex">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-grow border border-gray-300 p-2 rounded"
                    placeholder="Escribe un mensaje..."
                />
                <button type="submit" className="ml-2 bg-blue-500 text-white p-2 rounded">
                    Enviar
                </button>
            </form>
        </div>
    );
}
