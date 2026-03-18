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

export function Injectable(options?: { singleton?: boolean }): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
    if (options?.singleton) {
      Reflect.defineMetadata(SINGLETON_KEY, true, target);
    }
  };
}

export function Singleton(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_KEY, true, target);
    Reflect.defineMetadata(SINGLETON_KEY, true, target);
  };
}

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

  register<T>(provider: Provider<T>): this {
    this.providers.set(provider.token, provider);
    return this;
  }

  registerClass<T>(cls: Constructor<T>): this {
    const isSingleton = Reflect.getMetadata(SINGLETON_KEY, cls) === true;
    this.providers.set(cls, {
      token: cls,
      useClass: cls,
      singleton: isSingleton,
    });
    return this;
  }

  registerValue<T>(token: Token, value: T): this {
    this.providers.set(token, { token, useValue: value, singleton: true });
    return this;
  }

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

  resolve<T>(token: Constructor<T>): T;
  resolve<T>(token: string | symbol): T;
  resolve<T>(token: Token): T {
    if (this.singletons.has(token)) {
      return this.singletons.get(token) as T;
    }

    const provider = this.providers.get(token) as Provider<T> | undefined;
    if (!provider) {
      if (
        typeof token === "function" &&
        Reflect.getMetadata(INJECTABLE_KEY, token)
      ) {
        const injectableToken = token as Constructor<T>;
        this.registerClass(injectableToken);
        return this.resolve(injectableToken);
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

  private construct<T>(cls: Constructor<T>): T {
    const paramTypes: Constructor[] =
      Reflect.getMetadata("design:paramtypes", cls) ?? [];
    const injections: Map<number, Token> =
      Reflect.getOwnMetadata(INJECT_KEY, cls) ?? new Map();

    const args = paramTypes.map((type, index) => {
      const overrideToken = injections.get(index);
      const token = overrideToken ?? type;
      if (typeof token === "string" || typeof token === "symbol") {
        return this.resolve(token);
      }
      return this.resolve(token as Constructor<unknown>);
    });

    return new cls(...args);
  }
}

export const container = new Container();
