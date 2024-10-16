"use client";
import React, { useState, useEffect } from 'react';
import styles from './page.module.css'; 
import Link from 'next/link';

const GameRoom = () => {
  const [gameCode, setGameCode] = useState('');
  const [error, setError] = useState('');
  const [validCodes, setValidCodes] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('http://localhost:4000/entrarSala');
        const data = await response.json();
        const codes = data.map(room => room.codigo);
        setValidCodes(codes);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }
    };
    fetchRooms();
  }, []); 

  const handleJoinGame = async (event) => {
    event.preventDefault();
    if (validCodes.includes(gameCode)) {
      console.log('Unido a la sala con código:', gameCode);
      <Link href="/otra-pagina">
      </Link>
      setError('');
    } else {
      setError('Código del juego no válido.');
    }
  };

  const handleCreateGame = async (event) => {
    event.preventDefault();

    if (validCodes.includes(gameCode)) {
      setError('El código de la sala ya existe. Por favor, elige otro.');
      return;
    }

    if (maxPlayers <= 1) {
      setError('El número máximo de jugadores debe ser mayor que 1.');
      return;
    }

    if (gameCode && maxPlayers) {
      try {
        const response = await fetch('http://localhost:4000/crearSala', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ codigo: gameCode, cantidad_personas: parseInt(maxPlayers) }),
        });

        if (!response.ok) {
          throw new Error('Error al crear la sala');
        }
        setGameCode('');
        setMaxPlayers('');
        document.getElementById('createGameModal').close(); 
        setError('');
        <Link href="/otra-pagina">
        </Link>
      } catch (err) {
        setError('Error al crear la sala.');
        console.error('Error:', err);
      }
    } else {
      setError('Por favor, ingrese un código y un número de jugadores.');
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>ArtAttack</h2>
      <div className={styles.form}>
      <form onSubmit={handleJoinGame} >
        <label htmlFor="gameCode" className={styles.label}>Código del Juego</label>
        <input
          type="text"
          id="gameCode"
          value={gameCode}
          onChange={(e) => {
            setGameCode(e.target.value);
            setError('');
          }}
          required
          className={styles.input}
        />
        <button type="submit" className={styles.button}>Unirse</button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
      <button className={styles.button} onClick={() => document.getElementById('createGameModal').showModal()}>Crear Juego</button>
      </div>
      <dialog id="createGameModal" className={styles.modal}>
        <form onSubmit={handleCreateGame} >
          <label htmlFor="gameCode" className={styles.label}>Código del Juego</label>
          <input
            type="text"
            id="newGameCode"
            value={gameCode}
            onChange={(e) => {
              setGameCode(e.target.value);
              setError('');
            }}
            required
            className={styles.input}
          />
          <label htmlFor="maxPlayers" className={styles.label}>Máx. Jugadores</label>
          <input
            type="number"
            id="maxPlayers"
            value={maxPlayers}
            onChange={(e) => {
              setMaxPlayers(e.target.value);
              setError('');
            }}
            required
            className={styles.input}
          />

          <div className={styles.dialogButtonsContainer}>
            <button type="submit" className={styles.dialogButton}>Crear Juego</button>
            <button type="button" className={styles.dialogButton} onClick={() => document.getElementById('createGameModal').close()}>Cancelar</button>
          </div>
        </form>
        {error && <p className={styles.error}>{error}</p>}
      </dialog>
    </div>
  );
};

export default GameRoom;
