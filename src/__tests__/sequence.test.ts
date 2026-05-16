import { describe, it, expect } from 'bun:test';
import { sequence } from '../core/sequence.js';

describe('SequenceBuilder', () => {
  it('exports valid Mermaid sequence', () => {
    const out = sequence('Auth')
      .actor('User')
      .actor('Server')
      .message('User', 'Server', 'POST /login')
      .replyMessage('Server', 'User', '200 OK')
      .toMermaid();
    expect(out).toContain('sequenceDiagram');
    expect(out).toContain('participant User');
    expect(out).toContain('participant Server');
    expect(out).toContain('POST /login');
    expect(out).toContain('200 OK');
  });

  it('solid messages use ->>', () => {
    const out = sequence().actor('A').actor('B').message('A', 'B', 'ping').toMermaid();
    expect(out).toContain('->>');
  });

  it('reply messages use -->>', () => {
    const out = sequence().actor('A').actor('B').replyMessage('A', 'B', 'pong').toMermaid();
    expect(out).toContain('->>');
  });

  it('auto-adds actors from messages', () => {
    const out = sequence().message('X', 'Y', 'hello').toMermaid();
    expect(out).toContain('participant X');
    expect(out).toContain('participant Y');
  });

  it('exports valid PlantUML', () => {
    const out = sequence().actor('A').actor('B').message('A', 'B', 'call').toPlantUML();
    expect(out).toContain('@startuml');
    expect(out).toContain('A -> B : call');
  });

  it('exports valid JSON', () => {
    const json = sequence('Test').actor('A').toJSON();
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe('sequence');
    expect(parsed.actors).toContain('A');
  });
});
