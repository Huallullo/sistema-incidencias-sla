import { generateTemporaryPassword } from '../src/utils/security';

describe('Security Utilities - generateTemporaryPassword', () => {
  it('debe generar una contraseña de la longitud por defecto (12)', () => {
    const password = generateTemporaryPassword();
    expect(password.length).toBe(12);
  });

  it('debe generar una contraseña de la longitud especificada', () => {
    const password = generateTemporaryPassword(16);
    expect(password.length).toBe(16);
  });

  it('debe lanzar un error si la longitud es menor que 8', () => {
    expect(() => generateTemporaryPassword(7)).toThrow();
  });

  it('debe contener al menos una mayúscula, una minúscula, un número y un caracter especial', () => {
    // Probamos varias veces por la aleatoriedad
    for (let i = 0; i < 50; i++) {
      const password = generateTemporaryPassword(12);
      
      expect(password).toMatch(/[A-Z]/); // Al menos una mayúscula
      expect(password).toMatch(/[a-z]/); // Al menos una minúscula
      expect(password).toMatch(/[0-9]/); // Al menos un número
      expect(password).toMatch(/[!@#$%^&*]/); // Al menos un caracter especial
    }
  });
});
