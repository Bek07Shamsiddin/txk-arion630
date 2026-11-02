import { parseDecimal } from '../../lib/core/numbers';

test('parseDecimal', () => {
  expect(parseDecimal('8,5')).toBe(8.5);
  expect(parseDecimal(' 245 ')).toBe(245);
  expect(parseDecimal('abc')).toBeNull();
  expect(parseDecimal('')).toBeNull();
});
test('parseDecimal: noto\'g\'ri shakllar', () => {
  expect(parseDecimal('1,2,3')).toBeNull();
  expect(parseDecimal('8.5')).toBe(8.5);
  expect(parseDecimal('12abc')).toBeNull();
});
