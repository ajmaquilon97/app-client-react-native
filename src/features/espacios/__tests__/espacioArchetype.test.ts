import { getModalidadReserva } from '../espacioArchetype';

describe('getModalidadReserva', () => {
  it('respeta lo que diga el backend por encima de la categoría', () => {
    expect(
      getModalidadReserva({ categoria: 'piscinas', modalidadReserva: 'franja_exclusiva' }),
    ).toBe('franja_exclusiva');
    expect(
      getModalidadReserva({ categoria: 'canchas', modalidadReserva: 'cupo_compartido' }),
    ).toBe('cupo_compartido');
  });

  // Red de seguridad mientras haya espacios sin `modalidadReserva`.
  it('sin dato del backend, las piscinas son de cupo compartido', () => {
    expect(getModalidadReserva({ categoria: 'piscinas', modalidadReserva: undefined })).toBe(
      'cupo_compartido',
    );
  });

  it('sin dato del backend, el resto es de franja exclusiva', () => {
    expect(getModalidadReserva({ categoria: 'canchas', modalidadReserva: undefined })).toBe(
      'franja_exclusiva',
    );
    expect(getModalidadReserva({ categoria: 'salones', modalidadReserva: undefined })).toBe(
      'franja_exclusiva',
    );
  });
});
