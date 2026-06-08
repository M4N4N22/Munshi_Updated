import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class LowStockAlertContext extends Model<
  InferAttributes<LowStockAlertContext>,
  InferCreationAttributes<LowStockAlertContext>
> {
  declare id: CreationOptional<number>;
  declare phone_number: string;
  declare factory_id: number;
  declare inventory_item_id: number;
  declare inventory_item_name: string;
  declare alert_sent_at: Date;
  declare expires_at: Date;

  declare readonly created_at?: Date;
  declare readonly updated_at?: Date;

  static setup(sequelize: Sequelize) {
    LowStockAlertContext.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        phone_number: {
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        inventory_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        inventory_item_name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        alert_sent_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'low_stock_alert_contexts',
        underscored: true,
        timestamps: true,
      },
    );
    return LowStockAlertContext;
  }

  static associate(models: any) {
    LowStockAlertContext.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    LowStockAlertContext.belongsTo(models.InventoryItem, {
      foreignKey: 'inventory_item_id',
      as: 'inventory_item',
    });
  }
}
