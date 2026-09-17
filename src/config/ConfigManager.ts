import * as dotenv from 'dotenv';
dotenv.config()

export type Environment = 'dev' | 'qa' | 'staging';

export interface EnvironmentConfig {
    env: Environment;
    baseUrl: string;
    apiUrl: string;
    brand: string;
    aiAnalysisEnabled: boolean;
    aiAnalysisMaxFailure: number;
    anthropicApiKey?: string;
    libraryBaseUrl: string;
}

class ConfigManager {
    private static instance: ConfigManager;
    private readonly env: Environment;
    private readonly config: EnvironmentConfig;

    private constructor() {
        this.env = this.parseEnvironemnt(process.env.ENV);
        this.config = this.loadConfig();

    }

    public static getInstance(): ConfigManager {
        if(!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();            
        }
        return ConfigManager.instance;
    }

    private parseEnvironemnt(value: string | undefined) : Environment {
        const normalized = (value || 'dev').toLowerCase();
        const valid : Environment[] = ['dev', 'qa', 'staging'];
        if(valid.includes(normalized as Environment)) {
            return normalized as Environment;
        }
        console.warn(`Invalid ENV value  '${value}', falling back to dev`);
        return 'dev';
    }

    private loadConfig(): EnvironmentConfig {
        const prefix = this.env.toUpperCase();
        const baseUrl = process.env[`${prefix}_BASE_URL`];
        const apiUrl = process.env[`${prefix}_API_URL`];

        if(!baseUrl || !apiUrl) {
            throw new Error(`Missing config for environment: ${this.env}. Check .env has ${prefix}_BASE_URL / ${prefix}_API_URL`);
        }

        const libraryBaseUrl = process.env.LIBRARY_BASE_URL;
        if(!libraryBaseUrl) {
            throw new Error(`Missing config: LIBRARY_BASE_URL. Check .env has LIBRARY_BASE_URL`);
        }

        return {
            env: this.env,
            baseUrl,
            apiUrl,
            brand: process.env.BRAND || 'automationexercise',
            aiAnalysisEnabled: process.env.AI_ANALYSIS_ENABLED === 'true',
            aiAnalysisMaxFailure: Number(process.env.AI_ANALYSIS_MAX_FAILURES || 10),
            anthropicApiKey: process.env.ANTHROPIC_API_KEY || undefined,
            libraryBaseUrl,
        };
    }

    public getConfig(): EnvironmentConfig {
        return this.config;
    }

    public getBaseUrl(): string {
        return this.config.baseUrl;
    }

    public getApiUrl(): string {
        return this.config.apiUrl;
    }

    public getLibraryBaseUrl(): string {
        return this.config.libraryBaseUrl;
    }

    public getEnv(): Environment {
        return this.env;
    }   
}

export default ConfigManager;

export const envConfig: EnvironmentConfig = ConfigManager.getInstance().getConfig();