'use client';
import { useState } from 'react';

export default function BotonDetectarPais() {
  const [pais, setPais] = useState('¿Dónde estás?');
  const [cargando, setCargando] = useState(false);

  const detectarUbicacion = () => {
    setCargando(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      try {
        const response = await fetch('/api/get-country', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lon }),
        });

        const data = await response.json();
        setPais(data.country ?? 'País no encontrado');
      } catch (err) {
        console.error(err);
        setPais('Error al detectar país');
      } finally {
        setCargando(false);
      }
    }, () => {
      setPais('Permiso denegado');
      setCargando(false);
    });
  };

  return (
    <button onClick={detectarUbicacion} className="p-2 bg-green-600 text-white rounded">
      {cargando ? 'Detectando ubicación...' : pais}
    </button>
  );
}
