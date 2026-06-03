import { Sequelize, SyncOptions } from 'sequelize';
import { SqlModelsType } from '../db.types';
import { SQL_MODELS } from '../models';
import { Logger } from '@nestjs/common';

export class SqlService {
  logger = new Logger(SqlService.name);
  public readonly models: SqlModelsType = {} as SqlModelsType;
  private readonly sequelize: Sequelize;
  private readonly dbHost: string;

  /** `sslmode=require` in the URL makes pg verify certs strictly; strip it and use dialectOptions. */
  private static connectionUriForSequelize(uri: string): string {
    return uri
      .replace(/([?&])sslmode=[^&]*/g, (_, sep) => (sep === '?' ? '?' : ''))
      .replace(/\?&/, '?')
      .replace(/\?$/, '');
  }

  constructor(uri: string) {
    this.dbHost = SqlService.dbHostFromUri(uri);
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    try {
      const needsSsl =
        uri.includes('supabase.com') || uri.includes('sslmode=require');
      const connectionUri = SqlService.connectionUriForSequelize(uri);

      this.sequelize = new Sequelize(connectionUri, {
        dialect: 'postgres',
        logging: console.log,
        dialectOptions: needsSsl
          ? { ssl: { rejectUnauthorized: false } }
          : undefined,
      });

      this.logger.log('Initializing models...');
      for (const [modelName, initFn] of Object.entries(SQL_MODELS)) {
        const typedModelName = modelName as keyof typeof SQL_MODELS;
        this.models[typedModelName] = initFn(this.sequelize) as any;
      }

      for (const model of Object.values(this.models)) {
        (model as any)?.associate?.(this.models);
      }

      this.logger.log('✅ All models initialized and associated.');
    } catch (err) {
      this.logger.error('Database connection error:', err);
      throw err;
    }
  }

  private static dbHostFromUri(uri: string): string {
    const match = uri.match(/@([^/?]+)/);
    return match?.[1] ?? 'unknown';
  }

  public async init() {
    try {
      this.logger.log(
        `Authenticating database connection (host: ${this.dbHost})...`,
      );
      await this.sequelize.authenticate();
      this.logger.log(
        `✅ Successfully connected to PostgreSQL (${this.dbHost})`,
      );
    } catch (err) {
      this.logger.error(
        '❌ Failed to connect to the database. Exiting app.',
        err,
      );
      process.exit(1); // Immediately stop the app
    }
  }

  async sync(options?: SyncOptions) {
    await this.sequelize.sync(options);
  }

  getSequelizeInstance(): Sequelize {
    return this.sequelize;
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.sequelize.authenticate();
      return true;
    } catch (error) {
      this.logger.error('Database connection error:', error);
      return false;
    }
  }
}
