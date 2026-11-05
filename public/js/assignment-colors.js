// El índice viene de la base de datos. Las clases mantienen la misma paleta en ambas vistas.
export function assignmentColorClass(value) {
  const index = Number(value);
  const color = Number.isInteger(index) && index >= 0 && index < 10 ? index : 0;
  return `assignment-color assignment-color-${color}`;
}
