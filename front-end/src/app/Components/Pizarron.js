"use client";
import React, { useRef, useEffect, useState } from "react";
import styles from './PizarronCanvas.module.css';

export default function PizarronCanvas({ clearCanvas }) {
    const canvasRef = useRef(null);
    const [context, setContext] = useState(null);
    const [drawing, setDrawing] = useState(false);
    const [currentColor, setCurrentColor] = useState("black");
    const [lineWidth, setLineWidth] = useState(3);
    const [actions, setActions] = useState([]);
    const [currentPath, setCurrentPath] = useState([]);
    const [isEraser, setIsEraser] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 900;
        canvas.height = 500;
        const ctx = canvas.getContext("2d");
        setContext(ctx);
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
    }, []);

    useEffect(() => {
        if (clearCanvas) {
            clearDrawing();
        }
    }, [clearCanvas]);

    const startDrawing = (e) => {
        if (context) {
            context.beginPath();
            context.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            setDrawing(true);
            setCurrentPath([{ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }]);
        }
    };

    const draw = (e) => {
        if (!drawing) return;
        const x = e.nativeEvent.offsetX;
        const y = e.nativeEvent.offsetY;
        smoothDraw(context, x, y);
    };

    const smoothDraw = (ctx, x, y) => {
        if (currentPath.length === 0) return;

        const lastPoint = currentPath[currentPath.length - 1];

        ctx.strokeStyle = isEraser ? "white" : currentColor;
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
        const ctx = canvasRef.current.getContext("2d");
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        const targetColor = ctx.getImageData(x, y, 1, 1).data;
        const fillColor = hexToRgb(currentColor);

        const stack = [{ x, y }];

        while (stack.length > 0) {
            const { x: sx, y: sy } = stack.pop();
            const index = (sy * imageData.width + sx) * 4;

            if (sx < 0 || sx >= imageData.width || sy < 0 || sy >= imageData.height) continue;
            if (imageData.data[index] === targetColor[0] &&
                imageData.data[index + 1] === targetColor[1] &&
                imageData.data[index + 2] === targetColor[2]) {

                imageData.data[index] = fillColor.r;
                imageData.data[index + 1] = fillColor.g;
                imageData.data[index + 2] = fillColor.b;
                imageData.data[index + 3] = 255; // Alpha

                stack.push({ x: sx + 1, y: sy });
                stack.push({ x: sx - 1, y: sy });
                stack.push({ x: sx, y: sy + 1 });
                stack.push({ x: sx, y: sy - 1 });
            }
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
                className={styles.canvas}
            />
            <div className={styles.controls}>
                {colors.map(color => (
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
                    onChange={(e) => {
                        setIsEraser(false);
                        setCurrentColor(e.target.value);
                    }}
                    className={styles.colorInput}
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
                            setCurrentColor("white");
                        }
                    }}
                    className={styles.eraserButton}
                >
                    {isEraser ? "Usar lápiz" : "Usar goma"}
                </button>
                <button
                    onClick={(e) => {
                        const rect = canvasRef.current.getBoundingClientRect();
                        fillArea(
                            Math.floor(e.clientX - rect.left),
                            Math.floor(e.clientY - rect.top)
                        );
                    }}
                    className={styles.fillButton}
                >
                    Rellenar
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