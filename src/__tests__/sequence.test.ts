import { describe, it, expect } from 'bun:test';
import { sequence } from '../core/sequence.js';
import { Model } from '../core/model.js';

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

describe('Sequence mutations — removeMessage / removeActor / updateMessage', () => {
  function makeSeq() {
    return sequence('Test')
      .actor('Alice')
      .actor('Bob')
      .message('Alice', 'Bob', 'Hello')
      .message('Bob', 'Alice', 'Hi back');
  }

  it('removeMessage removes by id', () => {
    const s = makeSeq();
    const msgs = s.getModel().toJSON().messages ?? [];
    expect(msgs).toHaveLength(2);
    const firstId = msgs[0]!.id;
    s.removeMessage(firstId);
    const after = s.getModel().toJSON().messages ?? [];
    expect(after).toHaveLength(1);
    expect(after[0]!.id).not.toBe(firstId);
  });

  it('removeMessage on missing id is a no-op', () => {
    const s = makeSeq();
    expect(() => s.removeMessage('nonexistent')).not.toThrow();
    expect(s.getModel().toJSON().messages).toHaveLength(2);
  });

  it('removeActor removes actor and all its messages', () => {
    const s = makeSeq();
    s.removeActor('Alice');
    const m = s.getModel().toJSON();
    expect(m.actors).not.toContain('Alice');
    // Both messages involve Alice, so both should be gone
    expect(m.messages).toHaveLength(0);
  });

  it('removeActor on missing name is a no-op', () => {
    const s = makeSeq();
    expect(() => s.removeActor('Nobody')).not.toThrow();
    expect(s.getModel().toJSON().actors).toHaveLength(2);
  });

  it('updateMessage patches label', () => {
    const s = makeSeq();
    const id = (s.getModel().toJSON().messages ?? [])[0]!.id;
    s.updateMessage(id, { label: 'Updated label' });
    const msg = (s.getModel().toJSON().messages ?? []).find((m) => m.id === id)!;
    expect(msg.label).toBe('Updated label');
  });

  it('updateMessage patches style', () => {
    const s = makeSeq();
    const id = (s.getModel().toJSON().messages ?? [])[0]!.id;
    s.updateMessage(id, { style: 'dashed' });
    const msg = (s.getModel().toJSON().messages ?? []).find((m) => m.id === id)!;
    expect(msg.style).toBe('dashed');
  });

  it('updateMessage throws on missing id', () => {
    const s = makeSeq();
    expect(() => s.updateMessage('ghost', { label: 'x' })).toThrow(/"ghost" not found/);
  });
});

describe('Model.addMessage — actor validation', () => {
  it('throws if from-actor is not registered', () => {
    const m = new Model('sequence');
    m.addActor('Bob');
    expect(() =>
      m.addMessage({ id: 'm1', from: 'Alice', to: 'Bob', label: 'hi', style: 'solid' }),
    ).toThrow(/unknown actor "Alice"/);
  });

  it('throws if to-actor is not registered', () => {
    const m = new Model('sequence');
    m.addActor('Alice');
    expect(() =>
      m.addMessage({ id: 'm1', from: 'Alice', to: 'Bob', label: 'hi', style: 'solid' }),
    ).toThrow(/unknown actor "Bob"/);
  });

  it('succeeds when both actors are registered', () => {
    const m = new Model('sequence');
    m.addActor('Alice');
    m.addActor('Bob');
    expect(() =>
      m.addMessage({ id: 'm1', from: 'Alice', to: 'Bob', label: 'hi', style: 'solid' }),
    ).not.toThrow();
    expect(m.toJSON().messages).toHaveLength(1);
  });
});

describe('Model.clone', () => {
  it('returns a deep-independent copy', () => {
    const m = new Model('flowchart', 'Original');
    m.addNode({ id: 'n1', label: 'Node 1' });
    const copy = m.clone();
    // Mutating copy does not affect original
    copy.addNode({ id: 'n2', label: 'Node 2' });
    expect(m.toJSON().nodes).toHaveLength(1);
    expect(copy.toJSON().nodes).toHaveLength(2);
  });

  it('clone preserves type and title', () => {
    const m = new Model('sequence', 'My Sequence');
    const copy = m.clone();
    expect(copy.toJSON().type).toBe('sequence');
    expect(copy.toJSON().title).toBe('My Sequence');
  });
});
