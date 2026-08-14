import React from 'react';

interface LocationMapProps {
  latitude: number;
  longitude: number;
}

export default function LocationMap({ latitude, longitude }: LocationMapProps) {
  const src = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  return (
    <iframe
      src={src}
      title="Ubicación del espacio"
      loading="lazy"
      style={{ border: 0, width: '100%', height: '100%' }}
    />
  );
}
