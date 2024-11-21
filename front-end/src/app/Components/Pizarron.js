import React, { useRef, useEffect, useState } from "react";
import styles from './PizarronCanvas.module.css';
import { useSocket } from "../hooks/useSocket";
import axios from 'axios';

export default function PizarronCanvas({ clearCanvas, disabled, canChangeBackground, roomCode, username }) {
    const canvasRef = useRef(null);
    const { socket } = useSocket(); // Socket integrado
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

        // Escuchar actualizaciones desde el servidor
        if (socket) {
            socket.on("canvasUpdated", ({ actions: receivedActions }) => {
                setActions(receivedActions);
                redrawCanvas(receivedActions);
            });

            socket.on("receiveCanvas", ({ actions: receivedActions }) => {
                setActions(receivedActions);
                redrawCanvas(receivedActions);
            });
        }

        return () => {
            if (socket) {
                socket.off("canvasUpdated");
                socket.off("receiveCanvas");
            }
        };
    }, [socket]);

    useEffect(() => {
        if (clearCanvas) {
            clearDrawing();
        }
    }, [clearCanvas]);

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
            if (socket && roomCode) {
                socket.emit("canvasUpdated", { room: roomCode, actions: newActions }); // Emitir la actualización al servidor con el código de la sala
            }
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
        if (socket && roomCode) {
            socket.emit("canvasUpdated", { room: roomCode, actions: [] }); // Emitir la limpieza al servidor con el código de la sala
        }
    };

    const saveCanvas = async () => {
        const canvasData = JSON.stringify(actions);
        try {
            await axios.post('/api/saveCanvas', {
                username,
                canvas_data: canvasData
            });
            if (socket && roomCode) {
                socket.emit("canvasUpdated", { room: roomCode, actions }); // Enviar el lienzo guardado al servidor
            }
            alert("Lienzo guardado y compartido!");
        } catch (error) {
            console.error("Error guardando el lienzo en la base de datos", error);
        }
    };

    const loadCanvas = async () => {
        try {
            const response = await axios.get(`/api/getLatestCanvas?roomCode=${roomCode}`);
            const savedActions = response.data.canvas_data;
            if (savedActions) {
                const parsedActions = JSON.parse(savedActions);
                setActions(parsedActions);
                redrawCanvas(parsedActions);
                if (socket && roomCode) {
                    socket.emit("receiveCanvas", { room: roomCode, actions: parsedActions }); // Emitir la actualización al servidor con el código de la sala
                }
            } else {
                console.log("No hay datos guardados.");
            }
        } catch (error) {
            console.error("Error cargando el lienzo desde la base de datos", error);
        }
    };

    const receiveCanvas = () => {
        if (socket && roomCode) {
            socket.emit("requestCanvas", { room: roomCode });
        }
    };

    const basicColors = [
        "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FFA500", "#800080", "#FFC0CB", "#FFFFFF"
    ];

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
                {basicColors.filter(color => color !== backgroundColor).map((color) => (
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
                <button onClick={undoDrawing} className={styles.undoButton}>
                    Volver
                </button>
                <button onClick={clearDrawing} className={styles.clearButton}>
                    Borrar
                </button>
                <button onClick={saveCanvas} className={styles.saveButton}>
                    Guardar y compartir
                </button>
                <button onClick={receiveCanvas} className={styles.loadButton}>
                    Recibir
                </button>
                <button onClick={downloadCanvasImage} className={styles.downloadButton}>
                    Descargar Imagen
                </button>
            </div>
        </div>
    );
}

