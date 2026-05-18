import { Model } from './model.js';
import type { SequenceMessage } from './types.js';
import { nextId } from './ids.js';
import { toMermaid } from '../exporters/mermaid.js';
import { toPlantUML } from '../exporters/plantuml.js';
import { toJSON } from '../exporters/json.js';

/**
 * Fluent builder for sequence-type diagrams. Mirrors `FlowchartBuilder` but
 * over `actors`/`messages` instead of `nodes`/`edges`.
 *
 * @example
 * ```ts
 * const puml = sequence('Checkout')
 *   .actor('User')
 *   .message('User', 'Server', 'POST /pay')
 *   .replyMessage('Server', 'User', '200 OK')
 *   .toPlantUML();
 * ```
 */
export class SequenceBuilder {
  private model: Model;

  /** @param title Optional human-readable diagram title. */
  constructor(title?: string) {
    this.model = new Model('sequence', title);
  }

  /** Register an actor. Duplicates are silently ignored. */
  actor(name: string): this {
    this.model.addActor(name);
    return this;
  }

  /**
   * Append a message. Both endpoints are auto-registered as actors if not
   * already present. The id is derived from the current message list.
   */
  message(
    from: string,
    to: string,
    label: string,
    options: Partial<Pick<SequenceMessage, 'style'>> = {},
  ): this {
    this.model.addActor(from);
    this.model.addActor(to);
    const messages = this.model.toJSON().messages ?? [];
    this.model.addMessage({
      id: nextId('m', messages),
      from,
      to,
      label,
      style: options.style ?? 'solid',
    });
    return this;
  }

  /** Convenience for a `dashed`-style return message. */
  replyMessage(from: string, to: string, label: string): this {
    return this.message(from, to, label, { style: 'dashed' });
  }

  /** Return the underlying `Model` for advanced operations or validation. */
  getModel(): Model {
    return this.model;
  }

  /** Serialize as Mermaid `sequenceDiagram` source. */
  toMermaid(): string {
    return toMermaid(this.model.toJSON());
  }

  /** Serialize as PlantUML sequence-diagram source. */
  toPlantUML(): string {
    return toPlantUML(this.model.toJSON());
  }

  /** Serialize as the package's JSON shape (full round-trip fidelity). */
  toJSON(): string {
    return toJSON(this.model.toJSON());
  }
}

/** Convenience constructor — `sequence('My Diagram')` is `new SequenceBuilder('My Diagram')`. */
export function sequence(title?: string): SequenceBuilder {
  return new SequenceBuilder(title);
}
