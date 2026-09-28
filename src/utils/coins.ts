/** "1 moneda", "12 monedas". */
export function coinsLabel(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'moneda' : 'monedas'}`;
}
