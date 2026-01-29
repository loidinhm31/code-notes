import { createContext, useContext, ReactNode } from "react";

export interface IPlatformServices {
    storage: {
        getItem: (key: string) => Promise<string | null>;
        setItem: (key: string, value: string) => Promise<void>;
        removeItem: (key: string) => Promise<void>;
    };
    fs?: {
        writeTextFile: (path: string, content: string) => Promise<void>;
        readTextFile: (path: string) => Promise<string>;
        save: (options?: any) => Promise<string | null>;
        open: (options?: any) => Promise<string | null>;
    };
    openUrl: (url: string) => Promise<void>;
}

const PlatformContext = createContext<IPlatformServices | null>(null);

export interface PlatformProviderProps {
    children: ReactNode;
    services: IPlatformServices;
}

export function PlatformProvider({ children, services }: PlatformProviderProps) {
    return (
        <PlatformContext.Provider value={services}>
            {children}
        </PlatformContext.Provider>
    );
}

export function usePlatformServices() {
    const context = useContext(PlatformContext);
    if (!context) {
        throw new Error("usePlatformServices must be used within a PlatformProvider");
    }
    return context;
}
