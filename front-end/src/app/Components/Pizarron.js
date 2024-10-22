"use client";
import React, { useRef, useEffect, useState } from "react";
import styles from './PizarronCanvas.module.css'; // Asegúrate de crear este archivo

export default function PizarronCanvas() {
    const canvasRef = useRef(null);
    const [context, setContext] = useState(null);
    const [dibujar, setDibujar] = useState(false);
    const [currentColor, setCurrentColor] = useState("black");
    const [lineWidth, setLineWidth] = useState(3);
    const [accionesDibujar, setAccionesDibujar] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [currentStyle, setCurrentStyle] = useState({ color: "black", lineWidth: 3 });
    const [isEraser, setIsEraser] = useState(false);

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
            context.lineWidth = isEraser ? lineWidth * 2 : currentStyle.lineWidth;
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
            newAcciones.forEach(({ path, style }) => {
                newContext.beginPath();
                newContext.strokeStyle = style.color;
                newContext.lineWidth = style.lineWidth;
                newContext.moveTo(path[0].x, path[0].y);
                path.forEach((point) => {
                    newContext.lineTo(point.x, point.y);
                });
                newContext.stroke();
            });
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
        <div className={styles.container}>
            <canvas
                ref={canvasRef}
                onMouseDown={empezarDibujar}
                onMouseMove={dibuja}
                onMouseUp={terminarDibujar}
                onMouseOut={terminarDibujar}
                className={styles.canvas}
            />
            <div className={styles.controls}>
                {colores.map(color => (
                    <button
                        key={color}
                        onClick={() => {
                            setIsEraser(false);
                            changeColor(color);
                        }}
                        className={styles.colorButton}
                        style={{ backgroundColor: color }}
                    />
                ))}
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                        setIsEraser(false);
                        changeColor(e.target.value);
                    }}
                    className={styles.colorInput}
                />
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => changeWidth(e.target.value)}
                    className={styles.rangeInput}
                />
                <button
                    onClick={() => {
                        setIsEraser(!isEraser);
                        if (!isEraser) {
                            setCurrentColor("white");
                        }
                    }}
                    className={styles.eraserButton}
                >
                    {isEraser ? "Usar lápiz" : "Usar goma"}
                </button>
            </div>
            <div className={styles.actionButtons}>
                <button className={styles.undoButton} onClick={undoDibujo}>
                    Undo
                </button>
                <button className={styles.clearButton} onClick={limpiarDibujo}>
                    Clear
                </button>
            </div>
        </div>
    );
}
