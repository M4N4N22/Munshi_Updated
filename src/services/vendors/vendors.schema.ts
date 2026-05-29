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
  declare phone?: string | null;
  declare email?: string | null;
  declare address?: string | null;
  declare gst_number?: string | null;
  declare notes?: string | null;
  declare is_active: CreationOptional<boolean>;

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
          type: DataTypes.STRING,
          allowNull: false,
        },
        phone: DataTypes.STRING,
        email: DataTypes.STRING,
        address: DataTypes.TEXT,
        gst_number: DataTypes.STRING,
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
        indexes: [{ fields: ['factory_id'] }, { fields: ['factory_id', 'name'] }],
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
      foreignKey: 'vendor_id',
      as: 'purchase_requests',
    });
  }
}
