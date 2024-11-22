import React, { useRef, useEffect, useState } from "react";
import styles from './PizarronCanvas.module.css';
import { io } from "socket.io-client";

const socket = io("http://localhost:4000"); // Reemplaza con la URL de tu servidor

export default function PizarronCanvas({ clearCanvas, disabled, canChangeBackground }) {
    const canvasRef = useRef(null);
    const [context, setContext] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState("black");
    const [lineWidth, setLineWidth] = useState(3);
    const [actions, setActions] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [isEraser, setIsEraser] = useState(false);
    const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
    const [backgroundChanged, setBackgroundChanged] = useState(false);
    const [isBackgroundSet, setIsBackgroundSet] = useState(false);
    const [isFilling, setIsFilling] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 900;
        canvas.height = 500;
        const ctx = canvas.getContext("2d");
        setContext(ctx);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // Establecer fondo blanco
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

    }, []);

    useEffect(() => {
        if (clearCanvas) {
            clearDrawing();
        }
    }, [clearCanvas]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (!disabled) {
                saveCanvas();
            }
        }, 2000); // Cada 2 segundos

        return () => clearInterval(interval);
    }, [actions, disabled]);

    const changeBackgroundColor = (newColor) => {
        if (canChangeBackground && !backgroundChanged) {
            setBackgroundColor(newColor);
            const ctx = canvasRef.current.getContext("2d");
            ctx.fillStyle = newColor;
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setBackgroundChanged(true);
            setIsBackgroundSet(true);
        }
    };

    const startDrawing = (e) => {
        if (disabled || !context || !isBackgroundSet) return;
        context.beginPath();
        context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setDrawing(true);
        setCurrentPath([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
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

        ctx.strokeStyle = isEraser ? backgroundColor : currentColor;
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
        setBackgroundChanged(false);
    };

    const saveCanvas = () => {
        // Enviar el lienzo al servidor para compartirlo con otros usuarios
        socket.emit("saveCanvas", JSON.stringify(actions));
    };

    const loadCanvas = () => {
        const savedActions = localStorage.getItem("latestCanvas");

        if (savedActions) {
            const parsedActions = JSON.parse(savedActions);
            setActions(parsedActions);
            redrawCanvas(parsedActions);
        } else {
            console.log("No hay datos guardados.");
        }
    };

    // Escuchar los eventos de socket para recibir un lienzo de otros usuarios
    socket.on("receiveCanvas", (canvasData) => {
        if (canvasData) {
            const parsedActions = JSON.parse(canvasData);
            setActions(parsedActions);
            redrawCanvas(parsedActions);
        }
    });

    const basicColors = [
        "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFA500", "#800080", "#FFC0CB", "#FFFFFF"
    ];

    const availableColors = basicColors.filter(color => color !== backgroundColor);

    const downloadCanvasImage = () => {
        const canvas = canvasRef.current;
        const imageData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imageData;
        link.download = "pizarron.png";
        link.click();
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
                            style={{ backgroundColor: color, width: 30, height: 30 }}
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
                style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
            />
            <div className={styles.controls}>
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
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
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
                            setCurrentColor(backgroundColor);
                        }
                    }}
                    className={styles.eraserButton}
                    style={{ backgroundColor: "white" }}
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
                <button onClick={loadCanvas} className={styles.loadButton}>
                    Cargar
                </button>
                <button onClick={downloadCanvasImage} className={styles.downloadButton} disabled={disabled}>
                    Descargar Imagen
                </button>
            </div>
        </div>
    );
}

