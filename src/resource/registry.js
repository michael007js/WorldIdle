/**
 * resource/registry.js — 资源注册表
 */
import { Resource } from './resource.js';

export class ResourceRegistry {
  constructor(data) {
    this.resources = (data.resources || []).map((d) => new Resource(d));
    this.byId = new Map(this.resources.map((r) => [r.id, r]));
  }
  get(id) { return this.byId.get(id); }
  all() { return this.resources; }
  byCategory(cat) { return this.resources.filter((r) => r.category === cat); }
}
