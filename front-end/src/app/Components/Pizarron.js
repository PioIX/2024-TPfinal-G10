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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault(); // Evita la acción predeterminada del navegador
                undoDrawing();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [actions]);

    const startDrawing = (e) => {
        if (disabled) return;
        if (context) {
            context.beginPath();
            context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            setDrawing(true);
            setCurrentPath([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
        }
    };

    const draw = (e) => {
        if (disabled || !drawing || isFilling) return;
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
        ctx.fillStyle = "#FFFFFF";
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
        ctx.fillStyle = "#FFFFFF"; // Rellenar fondo blanco
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

    const loadCanvas = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const savedImageData = localStorage.getItem("latestCanvas");

        if (savedImageData) {
            const img = new Image();
            img.onload = () => {
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.drawImage(img, 0, 0);
            };
            img.src = savedImageData;
        } else {
            console.log("No se guardó nada en localStorage");
        }
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

            imageData.data[index] = fillColor.r;
            imageData.data[index + 1] = fillColor.g;
            imageData.data[index + 1] = fillColor.b;
            imageData.data[index + 3] = 255;

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
                style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
            />
            <div className={styles.controls}>
                {colors.map(color => (
                    <button
                        key={color}
                        onClick={() => {
                            if (!disabled) {
                                setIsEraser(false);
                                setCurrentColor(color);
                            }
                        }}
                        className={styles.colorButton}
                        style={{ backgroundColor: color }}
                        disabled={disabled}
                    />
                ))}
                <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                        if (!disabled) {
                            setIsEraser(false);
                            setCurrentColor(e.target.value);
                        }
                    }}
                    className={styles.colorInput}
                    disabled={disabled}
                />
                <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => {
                        if (!disabled) {
                            setLineWidth(e.target.value);
                        }
                    }}
                    className={styles.rangeInput}
                    disabled={disabled}
                />
                <button
                    onClick={() => {
                        if (!disabled) {
                            setIsEraser(!isEraser);
                            if (isEraser) {
                                setCurrentColor("#000000");
                            } else {
                                setCurrentColor(currentColor);
                            }
                        }
                    }}
                    className={styles.eraserButton}
                    disabled={disabled}
                >
                    {isEraser ? "Usar lápiz" : "Usar goma"}
                </button>
                <button
                    onClick={() => {
                        if (!disabled) {
                            setIsFilling((prev) => {
                                if (prev) {
                                    setCurrentColor("#000000");
                                }
                                return !prev;
                            });
                        }
                    }}
                    className={styles.fillButton}
                    disabled={disabled}
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
                {/* Agregar el botón de cargar imagen */}
                <button onClick={loadCanvas} className={styles.loadButton} disabled={disabled}>
                    Cargar imagen
                </button>
            </div>
        </div>
    );
}
