import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { PURCHASE_REQUEST_STATUS } from './purchase-requests.constants';

export class PurchaseRequest extends Model<
  InferAttributes<PurchaseRequest>,
  InferCreationAttributes<PurchaseRequest>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare requester_id: number;
  declare vendor_id?: number | null;
  declare title: string;
  declare description?: string | null;
  declare status: CreationOptional<string>;
  declare notes?: string | null;

  static setup(sequelize: Sequelize) {
    PurchaseRequest.init(
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
        requester_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        vendor_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        title: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        description: DataTypes.TEXT,
        status: {
          type: DataTypes.STRING,
          defaultValue: PURCHASE_REQUEST_STATUS.DRAFT,
        },
        notes: DataTypes.TEXT,
      },
      {
        sequelize,
        tableName: 'purchase_requests',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['factory_id'] },
          { fields: ['factory_id', 'status'] },
          { fields: ['requester_id'] },
          { fields: ['vendor_id'] },
        ],
      },
    );
    return PurchaseRequest;
  }

  static associate(models: any) {
    PurchaseRequest.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    PurchaseRequest.belongsTo(models.User, {
      foreignKey: 'requester_id',
      as: 'requester',
    });
    PurchaseRequest.belongsTo(models.Vendor, {
      foreignKey: 'vendor_id',
      as: 'vendor',
    });
  }
}
