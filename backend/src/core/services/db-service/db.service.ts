import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SqlService } from './providers/sql.provider';
import { MongoModelsType, SqlModelsType } from './db.types';
import { MongoService } from './providers/mongo.provider';

@Injectable()
export class DbService implements OnModuleInit {
  private readonly logger = new Logger(DbService.name);
  public sqlService: SqlModelsType;
  public mongoService: MongoModelsType;
  private sqlConnection: SqlService;
  private mongoConnection: MongoService;

  constructor() {
    this.sqlConnection = new SqlService(
      process.env.POSTGRES_CONNECTION_STRING!,
    );
    // this.mongoConnection = new MongoService(
    //   process.env.MONGO_CONNECTION_STRING!,
    // );
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing DbService...');

    try {
      // Initialize SQL
      await this.sqlConnection.init();
      // await this.sqlConnection.sync({alter: true});
      this.sqlService = this.sqlConnection.models;
      this.logger.log('✅ SQL connection and model setup complete.');

      // Initialize Mongo
      // await this.mongoConnection.connect(process.env.MONGO_CONNECTION_STRING!);
      // this.mongoService = this.mongoConnection.models;
      // this.logger.log('✅ Mongo connection and model setup complete.');
    } catch (error) {
      this.logger.error('❌ Failed to initialize database connections.', error);
      process.exit(1);
    }
  }

  getSqlConnection() {
    return this.sqlConnection;
  }

  getMongoConnection() {
    return this.mongoConnection;
  }
}
