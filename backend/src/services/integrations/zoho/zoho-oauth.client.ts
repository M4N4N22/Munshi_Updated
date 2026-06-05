import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ZohoTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  api_domain?: string;
  token_type?: string;
}

export type ZohoOAuthClientExchange = (
  code: string,
) => Promise<ZohoTokenResponse>;

export type ZohoOAuthClientRefresh = (
  refreshToken: string,
) => Promise<ZohoTokenResponse>;

@Injectable()
export class ZohoOAuthClient {
  private readonly http: AxiosInstance;
  private exchangeImpl: ZohoOAuthClientExchange | null = null;
  private refreshImpl: ZohoOAuthClientRefresh | null = null;

  constructor() {
    this.http = axios.create({ timeout: 15000 });
  }

  /** Override HTTP for tests — no live Zoho calls in CI. */
  setExchangeHandler(handler: ZohoOAuthClientExchange | null): void {
    this.exchangeImpl = handler;
  }

  setRefreshHandler(handler: ZohoOAuthClientRefresh | null): void {
    this.refreshImpl = handler;
  }

  async exchangeAuthorizationCode(code: string): Promise<ZohoTokenResponse> {
    if (this.exchangeImpl) {
      return this.exchangeImpl(code);
    }
    return this.postToken({
      grant_type: 'authorization_code',
      code,
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<ZohoTokenResponse> {
    if (this.refreshImpl) {
      return this.refreshImpl(refreshToken);
    }
    return this.postToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
  }

  private async postToken(body: Record<string, string>): Promise<ZohoTokenResponse> {
    const accountsUrl = process.env.ZOHO_ACCOUNTS_URL?.replace(/\/$/, '');
    const clientId = process.env.ZOHO_CLIENT_ID?.trim();
    const clientSecret = process.env.ZOHO_CLIENT_SECRET?.trim();
    const redirectUri = process.env.ZOHO_REDIRECT_URI?.trim();

    if (!accountsUrl || !clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException('Zoho OAuth environment is not configured');
    }

    const params = new URLSearchParams({
      ...body,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const url = `${accountsUrl}/oauth/v2/token`;
    const res = await this.http.post<ZohoTokenResponse>(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.data?.access_token) {
      throw new InternalServerErrorException('Zoho token response missing access_token');
    }
    return res.data;
  }
}
