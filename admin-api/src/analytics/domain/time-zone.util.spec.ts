import { isValidIanaTimeZone } from './time-zone.util';

describe('time-zone.util', () => {
  it('accepts UTC and Europe/Malta', () => {
    expect(isValidIanaTimeZone('UTC')).toBe(true);
    expect(isValidIanaTimeZone('Europe/Malta')).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isValidIanaTimeZone('Not/AZone')).toBe(false);
    expect(isValidIanaTimeZone("'; DROP TABLE--")).toBe(false);
  });
});
