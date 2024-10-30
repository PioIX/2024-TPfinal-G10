"use client";
import React, { useRef, useEffect, useState } from "react";
import styles from './PizarronCanvas.module.css';

export default function PizarronCanvas({ clearCanvas, disabled }) {
    const canvasRef = useRef(null);
    const [context, setContext] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(3);
    const [actions, setActions] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [isEraser, setIsEraser] = useState(false);
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

    const startDrawing = (e) => {
        if (disabled) return; // Ignorar si está deshabilitado
        if (context) {
            context.beginPath();
            context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            setDrawing(true);
            setCurrentPath([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
        }
    };

    const draw = (e) => {
        if (disabled || !drawing || isFilling) return; // Ignorar si está deshabilitado
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
        smoothDraw(context, x, y);
    };

    const smoothDraw = (ctx, x, y) => {
        if (currentPath.length === 0) return;

        const lastPoint = currentPath[currentPath.length - 1];

        ctx.strokeStyle = isEraser ? "#FFFFFF" : currentColor;
        ctx.lineWidth = isEraser ? lineWidth * 2 : lineWidth;

        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
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
        ctx.fillStyle = "#FFFFFF"; // Vuelve a llenar el fondo blanco
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
        ctx.fillStyle = "#FFFFFF"; // Rellena el fondo blanco
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const saveCanvas = () => {
        const canvas = canvasRef.current;
        const imageData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imageData;
        link.download = "pizarron.png";
        link.click();
    };

    const fillArea = (x, y) => {
        if (!isFilling) return;

        const ctx = canvasRef.current.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const targetColor = [
            imageData.data[(y * imageData.width + x) * 4],
            imageData.data[(y * imageData.width + x) * 4 + 1],
            imageData.data[(y * imageData.width + x) * 4 + 2],
        ];
        const fillColor = hexToRgb(currentColor);

        // Comprobar si el color objetivo y el color de relleno son iguales
        if (
            targetColor[0] === fillColor.r &&
            targetColor[1] === fillColor.g &&
            targetColor[2] === fillColor.b
        ) {
            return;
        }

        const stack = [{ x, y }];
        const offsets = [
            { dx: 0, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: 1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 },
            { dx: -1, dy: -1 }
        ];

        while (stack.length > 0) {
            const { x: sx, y: sy } = stack.pop();
            const index = (sy * imageData.width + sx) * 4;

            if (
                sx < 0 || sx >= imageData.width || sy < 0 || sy >= imageData.height ||
                imageData.data[index] !== targetColor[0] ||
                imageData.data[index + 1] !== targetColor[1] ||
                imageData.data[index + 2] !== targetColor[2]
            ) continue;

            // Rellenar el píxel
            imageData.data[index] = fillColor.r;
            imageData.data[index + 1] = fillColor.g;
            imageData.data[index + 2] = fillColor.b;
            imageData.data[index + 3] = 255;

            // Añadir los píxeles vecinos a la pila
            offsets.forEach(({ dx, dy }) => {
                stack.push({ x: sx + dx, y: sy + dy });
            });
        }

        ctx.putImageData(imageData, 0, 0);
    };

    const hexToRgb = (hex) => {
        const bigint = parseInt(hex.slice(1), 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255,
        };
    };

    const colors = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#800080", "#FFA500", "#FFC0CB"];

    return (
        <div className={styles.container}>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={finishDrawing}
                onMouseOut={finishDrawing}
                onClick={(e) => {
                    const rect = canvasRef.current.getBoundingClientRect();
                    fillArea(
                        Math.floor(e.clientX - rect.left),
                        Math.floor(e.clientY - rect.top)
                    );
                }}
                className={styles.canvas}
                style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }} // Cambiar el cursor si está deshabilitado
            />
            <div className={styles.controls}>
                {colors.map(color => (
                    <button
                        key={color}
                        onClick={() => {
                            if (!disabled) { // Solo cambiar si no está deshabilitado
                                setIsEraser(false);
                                setCurrentColor(color);
                            }
                        }}
                        className={styles.colorButton}
                        style={{ backgroundColor: color }}
                        disabled={disabled} // Deshabilitar el botón si es necesario
                    />
                ))}
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                        if (!disabled) { // Solo cambiar si no está deshabilitado
                            setIsEraser(false);
                            setCurrentColor(e.target.value);
                        }
                    }}
                    className={styles.colorInput}
                    disabled={disabled} // Deshabilitar el input si es necesario
                />
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => {
                        if (!disabled) { // Solo cambiar si no está deshabilitado
                            setLineWidth(e.target.value);
                        }
                    }}
                    className={styles.rangeInput}
                    disabled={disabled} // Deshabilitar el input si es necesario
                />
                <button
                    onClick={() => {
                        if (!disabled) { // Solo cambiar si no está deshabilitado
                            setIsEraser(!isEraser);
                            if (isEraser) {
                                setCurrentColor("#000000"); // Cambia el color a negro al desactivar la goma
                            } else {
                                setCurrentColor(currentColor); // Mantiene el color actual si se activa la goma
                            }
                        }
                    }}
                    className={styles.eraserButton}
                    disabled={disabled} // Deshabilitar el botón si es necesario
                >
                    {isEraser ? "Usar lápiz" : "Usar goma"}
                </button>
                <button
                    onClick={() => {
                        if (!disabled) { // Solo cambiar si no está deshabilitado
                            setIsFilling((prev) => {
                                if (prev) {
                                    setCurrentColor("#000000");
                                }
                                return !prev;
                            });
                        }
                    }}
                    className={styles.fillButton}
                    disabled={disabled} // Deshabilitar el botón si es necesario
                >
                    {isFilling ? "Desactivar Rellenar" : "Activar Rellenar"}
                </button>
            </div>
            <div className={styles.actionButtons}>
                <button className={styles.undoButton} onClick={undoDrawing} disabled={disabled}>
                    Volver
                </button>
                <button className={styles.clearButton} onClick={clearDrawing} disabled={disabled}>
                    Borrar
                </button>
                <button onClick={saveCanvas} className={styles.saveButton} disabled={disabled}>
                    Guardar
                </button>
            </div>
        </div>
    );
}
