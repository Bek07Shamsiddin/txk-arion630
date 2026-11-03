import { DEFAULT_OPERATION_TYPES, DEFAULT_SETTINGS } from '../../lib/core/defaults';
import { equivalentHours, fuelLoadFactor, loadFactor } from '../../lib/core/loadFactor';
import type { OperationType } from '../../lib/core/types';

const S = DEFAULT_SETTINGS;
const OPS = DEFAULT_OPERATION_TYPES;
const op = (id: string, fuelLph: number): OperationType => ({
  id,
  name: id,
  fuelLph,
  source: 'test',
  verified: false,
});

test('K = G / G_nom', () => expect(loadFactor(op('plowing', 24), S)).toBeCloseTo(1.333, 3));
test('K cheklanadi', () => {
  expect(loadFactor(op('x', 100), S)).toBe(2.0);
  expect(loadFactor(op('y', 1), S)).toBe(0.2);
});
test("yoqilg'i bo'yicha K", () => expect(fuelLoadFactor(90, 5, S)).toBeCloseTo(1.0, 3));
test("yoqilg'i bo'yicha K ham cheklanadi", () => {
  expect(fuelLoadFactor(1000, 1, S)).toBe(2.0);
  expect(fuelLoadFactor(0, 1, S)).toBe(0.2);
});
test('soat <= 0 bo\'lsa xato', () => {
  expect(() => fuelLoadFactor(10, 0, S)).toThrow();
  expect(() => fuelLoadFactor(10, -1, S)).toThrow();
});
test('T_ekv aralash', () =>
  expect(
    equivalentHours(
      [
        { operationTypeId: 'plowing', hours: 3 },
        { operationTypeId: 'transport', hours: 2 },
      ],
      OPS,
      S,
    ),
  ).toBeCloseTo((3 * 24) / 18 + (2 * 10) / 18, 3));
test("yoqilg'i berilsa jadval o'rniga", () =>
  expect(equivalentHours([{ operationTypeId: 'sowing', hours: 4 }], OPS, S, 96)).toBeCloseTo(
    (4 * (96 / 4)) / 18,
    3,
  ));
test("noma'lum ish turi xato", () =>
  expect(() => equivalentHours([{ operationTypeId: '??', hours: 1 }], OPS, S)).toThrow());
test('barcha boshlang\'ich ish turlari tasdiqlanmagan', () => {
  expect(OPS.map((o) => o.id)).toEqual([
    'plowing', 'chisel', 'disking', 'cultivation', 'sowing', 'transport', 'idle',
  ]);
  expect(OPS.every((o) => o.verified === false)).toBe(true);
});
