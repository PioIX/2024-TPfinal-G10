'use client';
import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

const GameRoom = () => {
  const [gameCode, setGameCode] = useState('');
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');
  const [validCodes, setValidCodes] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState('');


  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await fetch('http://10.1.5.150:4000/entrarSala');
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
    if (validCodes.includes(gameCode) && userName.trim()) {
      try {
        await fetch('http://10.1.5.150:4000/guardarNombre', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nombre: userName }),
        });

        window.location.href = `http://10.1.5.150:3000/page?room=${gameCode}&username=${userName}&turno=2`; 

        setError('');
      } catch (err) {
        console.error('Error guardando nombre:', err);
        setError('Error al unirse a la sala.');
      }
    } else {
      setError('Código del juego no válido o nombre vacío.');
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

    if (gameCode && maxPlayers && userName.trim()) {
      try {
        await fetch('http://10.1.5.150:4000/crearSala', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ codigo: gameCode, cantidad_personas: parseInt(maxPlayers) }),
        });

        await fetch('http://10.1.5.150:4000/guardarNombre', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nombre: userName }),
        });

        setGameCode('');
        setMaxPlayers('');
        setUserName('');
        document.getElementById('createGameModal').close(); 
        setError('');

        window.location.href = `http://10.1.5.150:3000/page?room=${gameCode}&username=${userName}&turno=1`; 

      } catch (err) {
        setError('Error al crear la sala.');
        console.error('Error:', err);
      }
    } else {
      setError('Por favor, ingrese un código, un número de jugadores y su nombre.');
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>ArtAttack</h2>
      <div className={styles.form}>
        <form onSubmit={handleJoinGame}>
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
          <label htmlFor="userName" className={styles.label}>Tu Nombre</label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
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
        <form onSubmit={handleCreateGame}>
          <label htmlFor="newGameCode" className={styles.label}>Código del Juego</label>
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
          <label htmlFor="newUserName" className={styles.label}>Tu Nombre</label>
          <input
            type="text"
            id="newUserName"
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value);
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
