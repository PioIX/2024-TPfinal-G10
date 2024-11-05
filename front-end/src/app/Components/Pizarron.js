"use client";
import React, { useRef, useEffect, useState } from "react";
import styles from './PizarronCanvas.module.css';

export default function PizarronCanvas({ clearCanvas, disabled, canChangeBackground }) {
    const canvasRef = useRef(null);
    const [context, setContext] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState("black"); // Color inicial de pintura
    const [lineWidth, setLineWidth] = useState(3);
    const [actions, setActions] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [isEraser, setIsEraser] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
    const [backgroundChanged, setBackgroundChanged] = useState(false); // Controla si el fondo ya fue cambiado
    const [isBackgroundSet, setIsBackgroundSet] = useState(false); // Indica si el fondo está configurado
    const [timerStarted, setTimerStarted] = useState(false); // Estado para el cronómetro

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 900;
        canvas.height = 500;
        const ctx = canvas.getContext("2d");
        setContext(ctx);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        if (isBackgroundSet) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            if (!timerStarted) {
                // Iniciar el cronómetro solo cuando el fondo haya sido seleccionado
                startTimer();
            }
        }
    }, [isBackgroundSet]); // Este efecto solo se ejecuta cuando se cambia el fondo

    useEffect(() => {
        if (clearCanvas) {
            clearDrawing();
        }
    }, [clearCanvas]);

    // Cambiar el fondo solo si es permitido y aún no ha cambiado
    const changeBackgroundColor = (newColor) => {
        if (canChangeBackground && !backgroundChanged) {
            setBackgroundColor(newColor);
            const ctx = canvasRef.current.getContext("2d");
            ctx.fillStyle = newColor;
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setBackgroundChanged(true); // Marcar que el fondo ya ha sido cambiado
            setIsBackgroundSet(true); // El fondo ya está configurado, permitir el dibujo
        }
    };

    const startDrawing = (e) => {
        if (context && !disabled && isBackgroundSet) {
            context.beginPath();
            context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            setDrawing(true);
            setCurrentPath([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
        }
    };

    const draw = (e) => {
        if (!drawing || disabled || !isBackgroundSet) return;
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
        smoothDraw(context, x, y);
    };

    const smoothDraw = (ctx, x, y) => {
        if (currentPath.length === 0) return;

        const lastPoint = currentPath[currentPath.length - 1];

        // Usar el color del fondo para la goma
        ctx.strokeStyle = isEraser ? backgroundColor : currentColor; // Si es goma, usa el color de fondo
        ctx.lineWidth = isEraser ? lineWidth * 2 : lineWidth;

        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, (lastPoint.x + x) / 2, (lastPoint.y + y) / 2);
        ctx.lineTo(x, y);
        ctx.stroke();

        setCurrentPath((prev) => [...prev, { x, y }]);
    };

    const finishDrawing = () => {
        setDrawing(false);
        if (currentPath.length > 0) {
            setActions((prev) => [...prev, { path: currentPath, color: currentColor, lineWidth }]);
            setCurrentPath([]);
        }
        context.closePath();
    };

    const undoDrawing = () => {
        if (actions.length > 0) {
            const newActions = [...actions];
            newActions.pop();
            setActions(newActions);
            redrawCanvas(newActions);
        }
    };

    const redrawCanvas = (actions) => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        actions.forEach(({ path, color, lineWidth }) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(point => {
                ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();
        });
    };

    const clearDrawing = () => {
        setActions([]);
        setCurrentPath([]);
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        setBackgroundChanged(false); // Reset background state on clear
    };

    const saveCanvas = () => {
        const canvas = canvasRef.current;
        const imageData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imageData;
        link.download = "pizarron.png";
        link.click();
    };

    // Lista de colores básicos disponibles
    const basicColors = [
        "#000000", // Negro
        "#FF0000", // Rojo
        "#00FF00", // Verde
        "#0000FF", // Azul
        "#FFFF00", // Amarillo
        "#FFA500", // Naranja
        "#800080", // Morado
        "#FFC0CB", // Rosa
        "#FFFFFF", // Blanco
    ];

    // Filtrar el color de fondo para no aparecer en la paleta de colores
    const availableColors = basicColors.filter(color => color !== backgroundColor);

    const startTimer = () => {
        console.log("El cronómetro ha comenzado.");
        setTimerStarted(true);  // El cronómetro ha comenzado
    };

    return (
        <div className={styles.container}>
            {canChangeBackground && !backgroundChanged && (
                <div className={styles.backgroundColorSelector}>
                    <h4>Elige el color de fondo:</h4>
                    {basicColors.map((color) => (
                        <button
                            key={color}
                            onClick={() => changeBackgroundColor(color)}
                            style={{ backgroundColor: color, width: 30, height: 30, border: 'none' }}
                            className={styles.colorButton}
                        />
                    ))}
                </div>
            )}
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={finishDrawing}
                onMouseOut={finishDrawing}
                className={styles.canvas}
            />
            <div className={styles.controls}>
                {/* Colores básicos, excluyendo el color de fondo */}
                {availableColors.map((color) => (
                    <button
                        key={color}
                        onClick={() => {
                            setIsEraser(false);
                            setCurrentColor(color);
                        }}
                        className={styles.colorButton}
                        style={{ backgroundColor: color }}
                    />
                ))}

                {/* Selector de color RGB para pintar */}
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)} // Cambiar color de la pintura
                    className={styles.colorPicker}
                />

                <input
                    type="range"
                    min="1"
                    max="150"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(e.target.value)}
                    className={styles.rangeInput}
                />
                <button
                    onClick={() => {
                        setIsEraser(!isEraser);
                        if (!isEraser) {
                            setCurrentColor(backgroundColor); // El color de la goma es el color de fondo
                        }
                    }}
                    className={styles.eraserButton}
                    style={{ backgroundColor: isEraser ? backgroundColor : "white" }} // Cambia el color del botón de la goma al color de fondo cuando está activa
                >
                    {isEraser ? "Usar lápiz" : "Usar goma"}
                </button>
            </div>
            <div className={styles.actionButtons}>
                <button className={styles.undoButton} onClick={undoDrawing}>
                    Volver
                </button>
                <button className={styles.clearButton} onClick={clearDrawing}>
                    Borrar
                </button>
                <button onClick={saveCanvas} className={styles.saveButton}>
                    Guardar
                </button>
            </div>
        </div>
    );
}
