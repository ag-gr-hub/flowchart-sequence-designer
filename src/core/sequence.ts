import { Model } from './model.js';
import type { SequenceMessage } from './types.js';
import { toMermaid } from '../exporters/mermaid.js';
import { toPlantUML } from '../exporters/plantuml.js';
import { toJSON } from '../exporters/json.js';

let _msgCounter = 0;

export class SequenceBuilder {
  private model: Model;

  constructor(title?: string) {
    this.model = new Model('sequence', title);
  }

  actor(name: string): this {
    this.model.addActor(name);
    return this;
  }

  message(from: string, to: string, label: string, options: Partial<Pick<SequenceMessage, 'style'>> = {}): this {
    this.model.addActor(from);
    this.model.addActor(to);
    this.model.addMessage({ id: `m${++_msgCounter}`, from, to, label, style: options.style ?? 'solid' });
    return this;
  }

  replyMessage(from: string, to: string, label: string): this {
    return this.message(from, to, label, { style: 'dashed' });
  }

  getModel(): Model {
    return this.model;
  }

  toMermaid(): string {
    return toMermaid(this.model.toJSON());
  }

  toPlantUML(): string {
    return toPlantUML(this.model.toJSON());
  }

  toJSON(): string {
    return toJSON(this.model.toJSON());
  }
}

export function sequence(title?: string): SequenceBuilder {
  return new SequenceBuilder(title);
}
