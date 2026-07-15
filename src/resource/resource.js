/**
 * resource/resource.js — 资源定义
 */
export class Resource {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.nameEn = def.nameEn;
    this.category = def.category; // raw / intermediate / product / special
    this.basePrice = def.basePrice;
    this.icon = def.icon || def.id;
    this.currentPrice = def.basePrice;
  }
}
