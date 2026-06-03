import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class InventoryCategory extends Model<
  InferAttributes<InventoryCategory>,
  InferCreationAttributes<InventoryCategory>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare name: string;
  declare description?: string | null;
  declare is_active: CreationOptional<boolean>;

  static setup(sequelize: Sequelize) {
    InventoryCategory.init(
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
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: DataTypes.TEXT,
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'inventory_categories',
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['factory_id', 'name'] },
          { fields: ['factory_id'] },
        ],
      },
    );
    return InventoryCategory;
  }

  static associate(models: any) {
    InventoryCategory.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    InventoryCategory.hasMany(models.InventoryItem, {
      foreignKey: 'category_id',
      as: 'items',
    });
  }
}

export class InventoryLocation extends Model<
  InferAttributes<InventoryLocation>,
  InferCreationAttributes<InventoryLocation>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare name: string;
  declare code?: string | null;
  declare address?: string | null;
  declare is_active: CreationOptional<boolean>;

  static setup(sequelize: Sequelize) {
    InventoryLocation.init(
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
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        code: DataTypes.STRING,
        address: DataTypes.TEXT,
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'inventory_locations',
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['factory_id', 'name'] },
          { fields: ['factory_id'] },
        ],
      },
    );
    return InventoryLocation;
  }

  static associate(models: any) {
    InventoryLocation.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    InventoryLocation.hasMany(models.InventoryItem, {
      foreignKey: 'location_id',
      as: 'items',
    });
  }
}

export class InventoryItem extends Model<
  InferAttributes<InventoryItem>,
  InferCreationAttributes<InventoryItem>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare category_id?: number | null;
  declare location_id?: number | null;
  declare sku: string;
  declare name: string;
  declare unit: string;
  declare current_quantity: CreationOptional<string>;
  declare reorder_threshold?: string | null;
  declare is_active: CreationOptional<boolean>;

  static setup(sequelize: Sequelize) {
    InventoryItem.init(
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
        category_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        location_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        sku: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        unit: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        current_quantity: {
          type: DataTypes.DECIMAL(18, 4),
          defaultValue: 0,
        },
        reorder_threshold: {
          type: DataTypes.DECIMAL(18, 4),
          allowNull: true,
        },
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'inventory_items',
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['factory_id', 'sku'] },
          { fields: ['factory_id'] },
          { fields: ['category_id'] },
          { fields: ['location_id'] },
        ],
      },
    );
    return InventoryItem;
  }

  static associate(models: any) {
    InventoryItem.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    InventoryItem.belongsTo(models.InventoryCategory, {
      foreignKey: 'category_id',
      as: 'category',
    });
    InventoryItem.belongsTo(models.InventoryLocation, {
      foreignKey: 'location_id',
      as: 'location',
    });
    InventoryItem.hasMany(models.InventoryTransaction, {
      foreignKey: 'inventory_item_id',
      as: 'transactions',
    });
  }
}

export class InventoryTransaction extends Model<
  InferAttributes<InventoryTransaction>,
  InferCreationAttributes<InventoryTransaction>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare inventory_item_id: number;
  declare transaction_type: string;
  declare quantity: string;
  declare reference_type?: string | null;
  declare reference_id?: number | null;
  declare notes?: string | null;
  declare created_by?: number | null;
  declare readonly created_at?: Date;

  static setup(sequelize: Sequelize) {
    InventoryTransaction.init(
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
        inventory_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        transaction_type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        quantity: {
          type: DataTypes.DECIMAL(18, 4),
          allowNull: false,
        },
        reference_type: DataTypes.STRING,
        reference_id: DataTypes.INTEGER,
        notes: DataTypes.TEXT,
        created_by: DataTypes.INTEGER,
      },
      {
        sequelize,
        tableName: 'inventory_transactions',
        underscored: true,
        timestamps: true,
        updatedAt: false,
        indexes: [
          { fields: ['factory_id'] },
          { fields: ['inventory_item_id'] },
          { fields: ['reference_type', 'reference_id'] },
        ],
      },
    );
    return InventoryTransaction;
  }

  static associate(models: any) {
    InventoryTransaction.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    InventoryTransaction.belongsTo(models.InventoryItem, {
      foreignKey: 'inventory_item_id',
      as: 'item',
    });
    InventoryTransaction.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
    });
  }
}
