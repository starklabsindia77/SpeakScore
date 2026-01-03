import { Issuer, Client } from 'openid-client';
import { db } from '../db';

export interface OIDCTokenResponse {
    sub: string;
    email?: string;
    name?: string;
    [key: string]: any;
}

export class SSOService {
    private static clients = new Map<string, Client>();

    static async getClient(orgId: string): Promise<Client | null> {
        if (this.clients.has(orgId)) {
            return this.clients.get(orgId)!;
        }

        const config = await db
            .selectFrom('sso_configs')
            .selectAll()
            .where('org_id', '=', orgId)
            .where('is_active', '=', true)
            .where('type', '=', 'OIDC')
            .executeTakeFirst();

        if (!config) return null;

        const issuer = await Issuer.discover(config.issuer_url);
        const client = new issuer.Client({
            client_id: config.client_id,
            client_secret: config.client_secret_enc, // Should be decrypted in a real app
            redirect_uris: [`${process.env.API_BASE_URL}/api/auth/sso/callback`],
            response_types: ['code'],
        });

        this.clients.set(orgId, client);
        return client;
    }

    static async getAuthorizationUrl(orgId: string, state: string): Promise<string | null> {
        const client = await this.getClient(orgId);
        if (!client) return null;

        return client.authorizationUrl({
            scope: 'openid email profile',
            state,
        });
    }

    static async handleCallback(orgId: string, params: any, state: string): Promise<OIDCTokenResponse | null> {
        const client = await this.getClient(orgId);
        if (!client) return null;

        const tokenSet = await client.callback(`${process.env.API_BASE_URL}/api/auth/sso/callback`, params, { state });
        const userinfo = await client.userinfo(tokenSet);

        return userinfo as OIDCTokenResponse;
    }
}
