import { describe, it, expect } from 'vitest';
import { formatDateColumnsDDMMYYYY } from '../utils/parser';

describe('formatDateColumnsDDMMYYYY', () => {
  it('converts Excel serial number to dd/mm/yyyy when header contains "ngày"', () => {
    const headers = ['Ngày CT', 'Amount'];
    const rows = [
      { 'Ngày CT': 45000, Amount: '1000' },
      { 'Ngày CT': 45001, Amount: '2000' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày CT']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(result[1]['Ngày CT']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    // Amount column untouched
    expect(result[0]['Amount']).toBe('1000');
  });

  it('converts YYYYMMDD string to dd/mm/yyyy when header contains "Date"', () => {
    const headers = ['Date', 'Value'];
    const rows = [
      { Date: '20260315', Value: '100' },
      { Date: '20260601', Value: '200' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Date']).toBe('15/03/2026');
    expect(result[1]['Date']).toBe('01/06/2026');
  });

  it('converts DDMMYYYY string to dd/mm/yyyy', () => {
    const headers = ['Ngày ghi sổ', 'Amount'];
    const rows = [
      { 'Ngày ghi sổ': '15032026', Amount: '500' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày ghi sổ']).toBe('15/03/2026');
  });

  it('leaves already-formatted dates unchanged', () => {
    const headers = ['Ngày', 'Amount'];
    const rows = [
      { Ngày: '15/06/2026', Amount: '100' },
      { Ngày: '2026-06-15', Amount: '200' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày']).toBe('15/06/2026');
    expect(result[1]['Ngày']).toBe('2026-06-15');
  });

  it('leaves non-date columns untouched', () => {
    const headers = ['Name', 'Amount'];
    const rows = [{ Name: 'Foo', Amount: '100' }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Name']).toBe('Foo');
    expect(result[0]['Amount']).toBe('100');
  });

  it('handles empty rows array', () => {
    const headers = ['Ngày'];
    const result = formatDateColumnsDDMMYYYY(headers, []);
    expect(result).toEqual([]);
  });

  it('handles undefined and null values gracefully', () => {
    const headers = ['Ngày'];
    const rows = [{ Ngày: undefined }, { Ngày: null }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày']).toBe('');
    expect(result[1]['Ngày']).toBe('');
  });

  it('only converts columns where header matches ngày|date', () => {
    const headers = ['Số ngày', 'Date', 'Name', 'Ngày hóa đơn'];
    const rows = [{
      'Số ngày': '15032026',
      'Date': 45000,
      'Name': 'Test',
      'Ngày hóa đơn': '20260315',
    }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Số ngày']).toBe('15/03/2026');
    expect(result[0]['Date']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(result[0]['Name']).toBe('Test');
    expect(result[0]['Ngày hóa đơn']).toBe('15/03/2026');
  });

  it('does not convert non-date values in date columns', () => {
    const headers = ['Ngày'];
    const rows = [{ Ngày: 'N/A' }, { Ngày: '123' }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày']).toBe('N/A');
    expect(result[1]['Ngày']).toBe('123');
  });
});
