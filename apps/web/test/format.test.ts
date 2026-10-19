import { describe, expect, it } from 'vitest';
import { eur, eurSigned, groupEs, numEs, parseEsNumber, pct, qty } from '../src/lib/format';

const n = (s: string) => s.replace(/ | /g, ' ');

describe('formato español con separador de miles siempre', () => {
  it('importes de 4 cifras también llevan punto', () => {
    expect(n(eur(6589))).toBe('6.589 €');
    expect(n(eur(16183))).toBe('16.183 €');
    expect(n(eur(1234.5, 2))).toBe('1.234,50 €');
    expect(n(eur(999))).toBe('999 €');
    expect(n(eurSigned(-2513))).toBe('−2.513 €');
    expect(n(eurSigned(0.4))).toBe('0 €');
  });
  it('números, participaciones y porcentajes', () => {
    expect(numEs(6300)).toBe('6.300');
    expect(numEs(1234.567, 2)).toBe('1.234,57');
    expect(qty(2280.16)).toBe('2.280,16');
    expect(n(pct(0.123))).toBe('12,3 %');
  });
  it('los campos de texto se agrupan al salir y se siguen leyendo bien', () => {
    expect(groupEs('6300')).toBe('6.300');
    expect(groupEs('6300,5')).toBe('6.300,5');
    expect(groupEs('6300,50')).toBe('6.300,50');
    expect(groupEs('1234.56')).toBe('1.234,56');
    expect(groupEs('6.300')).toBe('6.300');
    expect(groupEs('12,5')).toBe('12,5');
    expect(groupEs('hola')).toBe('hola');
    expect(groupEs('')).toBe('');
    for (const s of ['6.300', '6.300,5', '1.234,56', '1.000.000']) expect(parseEsNumber(groupEs(s))).toBe(parseEsNumber(s));
  });
});
