"use client";
import PizarronCanvas from "../Components/Pizarron";
import Chat from "../Components/Chat";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center p-12">
            <h1 className="text-4xl font-bold mb-8">Pizarron</h1>
            <div className="flex">
                <PizarronCanvas />
                <Chat />
            </div>
        </main>
    );
}
