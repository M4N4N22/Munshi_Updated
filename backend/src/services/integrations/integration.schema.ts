import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export class IntegrationConnection extends Model<
  InferAttributes<IntegrationConnection>,
  InferCreationAttributes<IntegrationConnection>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare provider: string;
  declare status: CreationOptional<string>;
  declare access_token?: string | null;
  declare refresh_token?: string | null;
  declare expires_at?: Date | null;
  declare metadata: CreationOptional<object>;

  static setup(sequelize: Sequelize) {
    IntegrationConnection.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        provider: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'active',
        },
        access_token: DataTypes.TEXT,
        refresh_token: DataTypes.TEXT,
        expires_at: DataTypes.DATE,
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        sequelize,
        tableName: 'integration_connections',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['factory_id'] },
          { fields: ['provider'] },
          { fields: ['status'] },
        ],
      },
    );
    return IntegrationConnection;
  }

  static associate(models: any) {
    IntegrationConnection.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    IntegrationConnection.hasMany(models.IntegrationItemMapping, {
      foreignKey: 'connection_id',
      as: 'itemMappings',
    });
    IntegrationConnection.hasMany(models.IntegrationSyncRun, {
      foreignKey: 'connection_id',
      as: 'syncRuns',
    });
    IntegrationConnection.hasMany(models.IntegrationPushDelivery, {
      foreignKey: 'connection_id',
      as: 'pushDeliveries',
    });
  }
}

export class IntegrationItemMapping extends Model<
  InferAttributes<IntegrationItemMapping>,
  InferCreationAttributes<IntegrationItemMapping>
> {
  declare id: CreationOptional<number>;
  declare connection_id: number;
  declare factory_id: number;
  declare external_id: string;
  declare external_sku?: string | null;
  declare inventory_item_id: number;
  declare last_synced_at?: Date | null;
  declare sync_status: CreationOptional<string>;

  static setup(sequelize: Sequelize) {
    IntegrationItemMapping.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        connection_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        external_id: {
          type: DataTypes.STRING(128),
          allowNull: false,
        },
        external_sku: DataTypes.STRING(128),
        inventory_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        last_synced_at: DataTypes.DATE,
        sync_status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'ok',
        },
      },
      {
        sequelize,
        tableName: 'integration_item_mappings',
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['connection_id', 'external_id'] },
          { fields: ['factory_id', 'inventory_item_id'] },
        ],
      },
    );
    return IntegrationItemMapping;
  }

  static associate(models: any) {
    IntegrationItemMapping.belongsTo(models.IntegrationConnection, {
      foreignKey: 'connection_id',
      as: 'connection',
    });
    IntegrationItemMapping.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    IntegrationItemMapping.belongsTo(models.InventoryItem, {
      foreignKey: 'inventory_item_id',
      as: 'inventoryItem',
    });
  }
}

export class IntegrationSyncRun extends Model<
  InferAttributes<IntegrationSyncRun>,
  InferCreationAttributes<IntegrationSyncRun>
> {
  declare id: CreationOptional<number>;
  declare connection_id: number;
  declare factory_id: number;
  declare direction: string;
  declare trigger: string;
  declare status: CreationOptional<string>;
  declare items_processed: CreationOptional<number>;
  declare error_summary?: string | null;
  declare started_at: CreationOptional<Date>;
  declare finished_at?: Date | null;

  static setup(sequelize: Sequelize) {
    IntegrationSyncRun.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        connection_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        direction: {
          type: DataTypes.STRING(16),
          allowNull: false,
        },
        trigger: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'running',
        },
        items_processed: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        error_summary: DataTypes.TEXT,
        started_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        finished_at: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'integration_sync_runs',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['connection_id'] },
          { fields: ['factory_id'] },
          { fields: ['status'] },
        ],
      },
    );
    return IntegrationSyncRun;
  }

  static associate(models: any) {
    IntegrationSyncRun.belongsTo(models.IntegrationConnection, {
      foreignKey: 'connection_id',
      as: 'connection',
    });
    IntegrationSyncRun.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
  }
}

export class IntegrationPushDelivery extends Model<
  InferAttributes<IntegrationPushDelivery>,
  InferCreationAttributes<IntegrationPushDelivery>
> {
  declare id: CreationOptional<number>;
  declare connection_id: number;
  declare factory_id: number;
  declare inventory_transaction_id: number;
  declare status: CreationOptional<string>;
  declare zoho_reference?: string | null;
  declare last_error?: string | null;
  declare delivered_at?: Date | null;

  static setup(sequelize: Sequelize) {
    IntegrationPushDelivery.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        connection_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        inventory_transaction_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'pending',
        },
        zoho_reference: DataTypes.STRING(256),
        last_error: DataTypes.TEXT,
        delivered_at: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'integration_push_deliveries',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['connection_id', 'inventory_transaction_id'],
          },
          { fields: ['connection_id'] },
          { fields: ['factory_id'] },
          { fields: ['status'] },
          { fields: ['inventory_transaction_id'] },
        ],
      },
    );
    return IntegrationPushDelivery;
  }

  static associate(models: any) {
    IntegrationPushDelivery.belongsTo(models.IntegrationConnection, {
      foreignKey: 'connection_id',
      as: 'connection',
    });
    IntegrationPushDelivery.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    IntegrationPushDelivery.belongsTo(models.InventoryTransaction, {
      foreignKey: 'inventory_transaction_id',
      as: 'inventoryTransaction',
    });
  }
}
