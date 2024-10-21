"use client";
import React, { useRef, useEffect, useState } from "react";

export default function PizarronCanvas() {
    const canvasRef = useRef(null);
    const [context, setContext] = useState(null);
    const [dibujar, setDibujar] = useState(false);
    const [currentColor, setCurrentColor] = useState("black");
    const [lineWidth, setLineWidth] = useState(3);
    const [accionesDibujar, setAccionesDibujar] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [currentStyle, setCurrentStyle] = useState({ color: "black", lineWidth: 3 });
    const [isEraser, setIsEraser] = useState(false); // Estado para la goma de borrar

    useEffect(() => {
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            canvas.width = 900;
            canvas.height = 500;
            const ctx = canvas.getContext("2d");
            setContext(ctx);
            dataAnterior(ctx);
        }
    }, []);

    const empezarDibujar = (e) => {
        if (context) {
            context.beginPath();
            context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            setDibujar(true);
        }
    };

    const dibuja = (e) => {
        if (!dibujar) return;
        if (context) {
            context.strokeStyle = isEraser ? "white" : currentStyle.color;
            context.lineWidth = isEraser ? lineWidth * 2 : currentStyle.lineWidth; // Goma más ancha
            context.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            context.stroke();
            setCurrentPath([...currentPath, { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
        }
    };

    const terminarDibujar = () => {
        setDibujar(false);
        context && context.closePath();
        if (currentPath.length > 0) {
            setAccionesDibujar([...accionesDibujar, { path: currentPath, style: currentStyle }]);
        }
        setCurrentPath([]);
    };

    const changeColor = (color) => {
        setCurrentColor(color);
        setCurrentStyle({ ...currentStyle, color });
    };

    const changeWidth = (width) => {
        setLineWidth(width);
        setCurrentStyle({ ...currentStyle, lineWidth: width });
    };

    const undoDibujo = () => {
        if (accionesDibujar.length > 0) {
            const newAcciones = [...accionesDibujar];
            newAcciones.pop();
            setAccionesDibujar(newAcciones);

            const newContext = canvasRef.current.getContext("2d");
            newContext.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            dataAnterior(newContext);
        }
    };

    const limpiarDibujo = () => {
        setAccionesDibujar([]);
        setCurrentPath([]);
        const newContext = canvasRef.current.getContext("2d");
        newContext.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const dataAnterior = (ctx) => {
        accionesDibujar.forEach(({ path, style }) => {
            ctx.beginPath();
            ctx.strokeStyle = style.color;
            ctx.lineWidth = style.lineWidth;
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach((point) => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });
    };

    const colores = ["black", "red", "green", "blue", "yellow", "purple", "orange", "pink"];

    return (
        <div>
            <canvas
                ref={canvasRef}
                onMouseDown={empezarDibujar}
                onMouseMove={dibuja}
                onMouseUp={terminarDibujar}
                onMouseOut={terminarDibujar}
                className="border border-gray"
            />
            <div className="flex my-4">
                {colores.map(color => (
                    <button
                        key={color}
                        onClick={() => {
                            setIsEraser(false); // Desactiva la goma al seleccionar un color
                            changeColor(color);
                        }}
                        style={{ backgroundColor: color, width: '40px', height: '40px', marginRight: '5px', border: 'none', cursor: 'pointer' }}
                    />
                ))}
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                        setIsEraser(false); // Desactiva la goma al seleccionar un color
                        changeColor(e.target.value);
                    }}
                    className="border border-gray-300 rounded"
                />
                <div className="flex-grow" />
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => changeWidth(e.target.value)}
                />
                <button
                    onClick={() => {
                        setIsEraser(!isEraser); // Alterna el estado de la goma
                        if (!isEraser) {
                            setCurrentColor("white"); // Cambia el color a blanco si se activa la goma
                        }
                    }}
                    style={{
                        backgroundColor: isEraser ? "gray" : "lightgray",
                        color: "black",
                        padding: '10px',
                        marginLeft: '10px',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    {isEraser ? "Usar lápiz" : "Usar goma"}
                </button>
            </div>
            <div className="flex justify-center my-4">
                <button className="bg-blue-500 text-white px-4 py-2 mr-2" onClick={undoDibujo}>
                    Undo
                </button>
                <button className="bg-red-500 text-white px-4 py-2" onClick={limpiarDibujo}>
                    Clear
                </button>
            </div>
        </div>
    );
}
