import { describe, expect, it } from 'vitest';
import { parseCommand, tokenizeArgs } from '../../../src/main/platform/windows/commands';

describe('Windows application commands', () => {
  it('normalizes executable paths while preserving URL arguments and Windows switches', () => {
    expect(parseCommand('C:/Apps/app.exe /open "https://example.com/a/b"')).toEqual({
      exe: 'C:\\Apps\\app.exe',
      args: ['/open', 'https://example.com/a/b'],
    });
  });
  it('preserves quoted paths and mid-token argument quotes', () => {
    expect(parseCommand('"C:\\Program Files\\App\\app.exe" --flag="hello world" --bare')).toEqual({
      exe: 'C:\\Program Files\\App\\app.exe',
      args: ['--flag=hello world', '--bare'],
    });
    expect(parseCommand('C:\\Program Files\\App\\app.exe "hello world"')).toEqual({
      exe: 'C:\\Program Files\\App\\app.exe',
      args: ['hello world'],
    });
    expect(tokenizeArgs('"quoted arg" --bare')).toEqual(['quoted arg', '--bare']);
  });
  it('retains unknown environment variables and expands known ones', () => {
    const key = 'RIPPLE_COMMAND_TEST_ROOT';
    process.env[key] = 'C:\\Apps';
    try {
      expect(parseCommand(`%${key}%/app.exe`)).toEqual({ exe: 'C:\\Apps\\app.exe', args: [] });
      expect(parseCommand('%RIPPLE_UNKNOWN%')).toEqual({ exe: '%RIPPLE_UNKNOWN%', args: [] });
    } finally {
      delete process.env[key];
    }
  });
});
