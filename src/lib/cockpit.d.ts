/**
 * Cockpit API type declarations for TypeScript.
 * Subset of the cockpit.js API used by cockpit-wifi.
 */

declare module 'cockpit' {
    interface SpawnOptions {
        superuser?: 'try' | 'require';
        err?: 'message' | 'out';
        environ?: string[];
    }

    interface SpawnResult extends Promise<string> {
        input(data: string): SpawnResult;
        stream(callback: (data: string) => void): SpawnResult;
        fail(callback: (error: Error) => void): SpawnResult;
        close(problem?: string): void;
    }

    interface FileHandle {
        read(): Promise<string>;
        replace(content: string): Promise<void>;
        watch(callback: (content: string | null, tag: string) => void): { remove(): void };
        close(): void;
        path: string;
    }

    interface FileOptions {
        superuser?: 'try' | 'require';
        syntax?: {
            parse(content: string): unknown;
            stringify(obj: unknown): string;
        };
    }

    interface DbusProxy {
        wait(): Promise<DbusProxy>;
        call(method: string, args?: unknown[]): Promise<unknown[]>;
        data: Record<string, unknown>;
        [key: string]: unknown;
    }

    interface DbusClient {
        proxy(iface?: string, path?: string): DbusProxy;
        call(path: string, iface: string, method: string, args?: unknown[]): Promise<unknown[]>;
        subscribe(match: Record<string, string>, callback: (path: string, iface: string, signal: string, args: unknown[]) => void): { remove(): void };
        close(): void;
        wait(): Promise<void>;
    }

    interface DbusOptions {
        bus?: string;
        superuser?: 'try' | 'require';
    }

    function spawn(args: string[], options?: SpawnOptions): SpawnResult;
    function file(path: string, options?: FileOptions): FileHandle;
    function dbus(name: string, options?: DbusOptions): DbusClient;

    function format_bytes(bytes: number): string;
    function gettext(message: string): string;
    function locale(po: Record<string, unknown>): void;
}

declare module 'cockpit-dark-theme' {
    // Side-effect import — enables Cockpit dark theme
}

declare module 'patternfly/patternfly-6-cockpit.scss' {
    // Side-effect import — PatternFly 6 Cockpit styles
}
