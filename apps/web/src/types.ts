export type AdminOrg = {
    id: string;
    name: string;
    schemaName: string;
    status: string;
    creditsBalance: number;
    createdAt: string;
    updatedAt?: string;
};

export type PlatformLog = {
    id: string;
    level: string;
    source: string;
    message: string;
    orgId?: string | null;
    createdAt: string;
    meta?: Record<string, any>
};
