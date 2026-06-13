import { describe, it, expect } from 'vitest';
import { handleAggregateGroupBy } from '../utils/aggregate';

describe('handleAggregateGroupBy', () => {
  const rows = [
    { key: 'A', amount: '10', qty: '5' },
    { key: 'A', amount: '20', qty: '3' },
    { key: 'B', amount: '30', qty: '7' },
    { key: 'B', amount: '40', qty: '2' },
  ];

  const groupKeys = ['key'];
  const numericCols = ['amount', 'qty'];

  it('returns original rows when groupKeys is empty', () => {
    const result = handleAggregateGroupBy(rows, [], numericCols, true);
    expect(result).toEqual(rows);
  });

  it('defaults to sum when no aggFunction provided', () => {
    const result = handleAggregateGroupBy(rows, groupKeys, numericCols, true);
    expect(result).toHaveLength(2);
    const a = result.find(r => r.key === 'A');
    const b = result.find(r => r.key === 'B');
    expect(a.amount).toBe(30);  // 10 + 20
    expect(a.qty).toBe(8);     // 5 + 3
    expect(b.amount).toBe(70); // 30 + 40
    expect(b.qty).toBe(9);     // 7 + 2
  });

  it('groups by key and sums numeric columns', () => {
    const result = handleAggregateGroupBy(rows, groupKeys, numericCols, true, 'sum');
    expect(result).toHaveLength(2);
    const a = result.find(r => r.key === 'A');
    expect(a.amount).toBe(30);
    expect(a.qty).toBe(8);
  });

  it('counts non-null values', () => {
    const rowsWithNull = [
      { key: 'A', amount: '10', qty: '5' },
      { key: 'A', amount: 'abc', qty: '3' },  // non-numeric
      { key: 'A', amount: '20', qty: null },   // null
    ];
    const result = handleAggregateGroupBy(rowsWithNull, ['key'], ['amount', 'qty'], true, 'count');
    expect(result).toHaveLength(1);
    const a = result[0];
    // amount: 2 valid numbers out of 3
    expect(a.amount).toBe(2);
    // qty: 2 valid numbers out of 3 (null is not a number)
    expect(a.qty).toBe(2);
  });

  it('averages numeric columns', () => {
    const result = handleAggregateGroupBy(rows, groupKeys, numericCols, true, 'average');
    const a = result.find(r => r.key === 'A');
    expect(a.amount).toBe(15);  // (10 + 20) / 2
    expect(a.qty).toBe(4);      // (5 + 3) / 2
  });

  it('finds minimum values', () => {
    const result = handleAggregateGroupBy(rows, groupKeys, numericCols, true, 'min');
    const a = result.find(r => r.key === 'A');
    expect(a.amount).toBe(10);
    expect(a.qty).toBe(3);
    const b = result.find(r => r.key === 'B');
    expect(b.amount).toBe(30);
    expect(b.qty).toBe(2);
  });

  it('finds maximum values', () => {
    const result = handleAggregateGroupBy(rows, groupKeys, numericCols, true, 'max');
    const a = result.find(r => r.key === 'A');
    expect(a.amount).toBe(20);
    expect(a.qty).toBe(5);
    const b = result.find(r => r.key === 'B');
    expect(b.amount).toBe(40);
    expect(b.qty).toBe(7);
  });

  it('includes _Grouped_Rows_Count metadata', () => {
    const result = handleAggregateGroupBy(rows, groupKeys, numericCols, true, 'sum');
    const a = result.find(r => r.key === 'A');
    expect(a._Grouped_Rows_Count).toBe(2);
    const b = result.find(r => r.key === 'B');
    expect(b._Grouped_Rows_Count).toBe(2);
  });

  it('handles empty array', () => {
    const result = handleAggregateGroupBy([], groupKeys, numericCols, true, 'sum');
    expect(result).toHaveLength(0);
  });

  it('handles single row', () => {
    const singleRow = [{ key: 'A', amount: '10', qty: '5' }];
    const result = handleAggregateGroupBy(singleRow, groupKeys, numericCols, true, 'sum');
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(10);
    expect(result[0].qty).toBe(5);
  });

  it('treats non-numeric values as 0 for sum', () => {
    const badRows = [
      { key: 'A', amount: 'abc', qty: '5' },
      { key: 'A', amount: '10', qty: '3' },
    ];
    const result = handleAggregateGroupBy(badRows, ['key'], ['amount', 'qty'], true, 'sum');
    expect(result[0].amount).toBe(10);  // 0 + 10
    expect(result[0].qty).toBe(8);      // 5 + 3
  });
});
