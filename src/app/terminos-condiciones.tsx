import React from 'react';
import { LegalDocumentScreen ,
  TERMINOS_CONDICIONES_TEXT,
  TERMINOS_CONDICIONES_VERSION,
  TERMINOS_CONDICIONES_FECHA,
} from '@/features/legal';

export default function TerminosCondicionesScreen() {
  return (
    <LegalDocumentScreen
      title="Términos y Condiciones"
      versionLabel={`Versión ${TERMINOS_CONDICIONES_VERSION} · Última actualización: ${TERMINOS_CONDICIONES_FECHA}`}
      content={TERMINOS_CONDICIONES_TEXT}
    />
  );
}
