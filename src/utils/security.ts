/**
 * Genera una contraseña temporal aleatoria y segura para nuevos usuarios.
 * Satisface políticas típicas de contraseñas complejas:
 * - Al menos 12 caracteres
 * - Al menos una letra mayúscula
 * - Al menos una letra minúscula
 * - Al menos un número
 * - Al menos un carácter especial (!@#$%^&*)
 */
export function generateTemporaryPassword(length = 12): string {
  if (length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres por seguridad.');
  }

  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const specials = '!@#$%^&*';
  
  // Asegurar que contenga al menos uno de cada tipo
  const passwordArr = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ];

  const allChars = upper + lower + digits + specials;
  
  // Rellenar hasta la longitud deseada
  for (let i = passwordArr.length; i < length; i++) {
    passwordArr.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Mezclar el array para que no comience siempre en el mismo orden
  for (let i = passwordArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordArr[i], passwordArr[j]] = [passwordArr[j], passwordArr[i]];
  }

  return passwordArr.join('');
}
