import type { ProductProvider } from "./provider";

export class ProviderRegistry {
  private readonly providers = new Map<string, ProductProvider>();

  register(provider: ProductProvider) {
    if (this.providers.has(provider.id)) throw new Error(`Provider duplicado: ${provider.id}`);
    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string) { return this.providers.get(id); }
  list() { return [...this.providers.values()]; }

  require(id: string) {
    const provider = this.get(id);
    if (!provider) throw new Error(`Provider não registrado: ${id}`);
    return provider;
  }
}
