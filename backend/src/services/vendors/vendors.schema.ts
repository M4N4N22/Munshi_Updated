import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class Vendor extends Model<
  InferAttributes<Vendor>,
  InferCreationAttributes<Vendor>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare name: string;
  declare phone_number: string;
  declare email?: string | null;
  declare address?: string | null;
  declare gst_number?: string | null;
  declare notes?: string | null;
  declare is_active: CreationOptional<boolean>;
  declare readonly created_at?: Date;
  declare readonly updated_at?: Date;

  static setup(sequelize: Sequelize) {
    Vendor.init(
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
          type: DataTypes.STRING(VENDOR_NAME_MAX),
          allowNull: false,
        },
        phone_number: {
          type: DataTypes.STRING(VENDOR_PHONE_MAX),
          allowNull: false,
        },
        email: DataTypes.STRING(VENDOR_EMAIL_MAX),
        address: DataTypes.TEXT,
        gst_number: DataTypes.STRING(VENDOR_GST_MAX),
        notes: DataTypes.TEXT,
        is_active: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
      },
      {
        sequelize,
        tableName: 'vendors',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['factory_id'] },
          { fields: ['factory_id', 'is_active'] },
          { fields: ['factory_id', 'gst_number'] },
        ],
      },
    );
    return Vendor;
  }

  static associate(models: any) {
    Vendor.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    Vendor.hasMany(models.PurchaseRequest, {
      foreignKey: 'assigned_vendor_id',
      as: 'purchase_requests',
    });
  }
}

const VENDOR_NAME_MAX = 255;
const VENDOR_PHONE_MAX = 32;
const VENDOR_EMAIL_MAX = 255;
const VENDOR_GST_MAX = 15;
