import "reflect-metadata";

// ─── Metadata Keys ──────────────────────────────────────────────
const INJECTABLE_KEY = Symbol("injectable");
const SINGLETON_KEY = Symbol("singleton");
const INJECT_KEY = Symbol("inject");

// ─── Types ──────────────────────────────────────────────────────
// biome-ignore lint: any[] is required for DI constructor compatibility
type Constructor<T = unknown> = new (...args: any[]) => T;
type Token = string | symbol | Constructor;

interface Provider<T = unknown> {
  token: Token;
  useClass?: Constructor<T>;
  useFactory?: () => T;
  useValue?: T;
  singleton?: boolean;
}

// ─── Decorators ─────────────────────────────────────────────────

/**
 * Marks a class as injectable into the DI container.
 * Optionally accepts `{ singleton: true }` to register as a singleton.
 */
export function Injectable(options?: { singleton?: boolean }): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
    if (options?.singleton) {
      Reflect.defineMetadata(SINGLETON_KEY, true, target);
    }
  };
}

/**
 * Shorthand for `@Injectable({ singleton: true })`.
 */
export function Singleton(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
    Reflect.defineMetadata(SINGLETON_KEY, true, target);
  };
}

/**
 * Parameter decorator — override the token used for injection.
 * Usage: `constructor(@Inject('DB') private db: Database)`
 */
export function Inject(token: Token): ParameterDecorator {
  return (target, _propertyKey, parameterIndex) => {
    const existing: Map<number, Token> =
      Reflect.getOwnMetadata(INJECT_KEY, target) ?? new Map();
    existing.set(parameterIndex, token);
    Reflect.defineMetadata(INJECT_KEY, existing, target);
  };
}

// ─── Container ──────────────────────────────────────────────────

export class Container {
  private providers = new Map<Token, Provider>();
  private singletons = new Map<Token, unknown>();

  /**
   * Register a provider manually.
   */
  register<T>(provider: Provider<T>): this {
    this.providers.set(provider.token, provider);
    return this;
  }

  /**
   * Register a class as a provider. Reads @Injectable / @Singleton metadata.
   */
  registerClass<T>(cls: Constructor<T>): this {
    const isSingleton = Reflect.getMetadata(SINGLETON_KEY, cls) === true;
    this.providers.set(cls, {
      token: cls,
      useClass: cls,
      singleton: isSingleton,
    });
    return this;
  }

  /**
   * Register a pre-built value (useful for configs, external clients, etc.).
   */
  registerValue<T>(token: Token, value: T): this {
    this.providers.set(token, { token, useValue: value, singleton: true });
    return this;
  }

  /**
   * Register a factory function.
   */
  registerFactory<T>(
    token: Token,
    factory: () => T,
    options?: { singleton?: boolean },
  ): this {
    this.providers.set(token, {
      token,
      useFactory: factory,
      singleton: options?.singleton,
    });
    return this;
  }

  /**
   * Resolve a dependency by token (class, string, or symbol).
   */
  resolve<T>(token: Constructor<T>): T;
  resolve<T>(token: string | symbol): T;
  resolve<T>(token: Token): T {
    // Check singleton cache
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    const provider = this.providers.get(token) as Provider<T> | undefined;
    if (!provider) {
      // Auto-resolve if it's a constructor marked @Injectable
      if (
        typeof token === "function" &&
        Reflect.getMetadata(INJECTABLE_KEY, token)
      ) {
        this.registerClass(token as Constructor);
        return this.resolve<T>(token);
      }
      throw new Error(`[DI] No provider found for token: ${String(token)}`);
    }

    let instance: T;

    if (provider.useValue !== undefined) {
      instance = provider.useValue as T;
    } else if (provider.useFactory) {
      instance = provider.useFactory() as T;
    } else if (provider.useClass) {
      instance = this.construct<T>(provider.useClass);
    } else {
      throw new Error(`[DI] Invalid provider for token: ${String(token)}`);
    }

    if (provider.singleton) {
      this.singletons.set(token, instance);
    }

    return instance;
  }

  /**
   * Instantiate a class by resolving its constructor dependencies.
   */
  private construct<T>(cls: Constructor<T>): T {
    const paramTypes: Constructor[] =
      Reflect.getMetadata("design:paramtypes", cls) ?? [];
    const injections: Map<number, Token> =
      Reflect.getOwnMetadata(INJECT_KEY, cls) ?? new Map();

    const args = paramTypes.map((type, index) => {
      const overrideToken = injections.get(index);
      return this.resolve(overrideToken ?? type);
    });

    return new cls(...args);
  }
}

// ─── Global container instance ──────────────────────────────────
export const container = new Container();
