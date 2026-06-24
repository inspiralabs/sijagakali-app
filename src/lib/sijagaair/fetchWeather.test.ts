import { describe, expect, it } from 'vitest';
import { isNightTimeWib, weatherEmoji } from './fetchWeather';

describe('isNightTimeWib', () => {
  it('menganggap 20:00 WIB sebagai malam', () => {
    expect(isNightTimeWib('2026-06-24 20:00:00')).toBe(true);
  });

  it('menganggap 03:00 WIB sebagai malam', () => {
    expect(isNightTimeWib('2026-06-24 03:00:00')).toBe(true);
  });

  it('menganggap 12:00 WIB sebagai siang', () => {
    expect(isNightTimeWib('2026-06-24 12:00:00')).toBe(false);
  });

  it('batas 18:00 masuk malam', () => {
    expect(isNightTimeWib('2026-06-24 18:00:00')).toBe(true);
  });

  it('batas 06:00 masuk siang', () => {
    expect(isNightTimeWib('2026-06-24 06:00:00')).toBe(false);
  });
});

describe('weatherEmoji', () => {
  it('menampilkan matahari untuk cerah siang', () => {
    expect(weatherEmoji(0, '2026-06-24 12:00:00')).toBe('☀️');
  });

  it('menampilkan bulan untuk cerah malam', () => {
    expect(weatherEmoji(0, '2026-06-24 22:00:00')).toBe('🌙');
  });

  it('tetap hujan di malam hari', () => {
    expect(weatherEmoji(61, '2026-06-24 22:00:00')).toBe('🌧️');
  });
});
