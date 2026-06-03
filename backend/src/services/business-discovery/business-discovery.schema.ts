import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { BUSINESS_DISCOVERY_STATUS } from './business-discovery.constants';

export class BusinessDiscoveryProfile extends Model<
  InferAttributes<BusinessDiscoveryProfile>,
  InferCreationAttributes<BusinessDiscoveryProfile>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare status: CreationOptional<string>;
  declare identity_completion: CreationOptional<number>;
  declare organization_completion: CreationOptional<number>;
  declare manager_completion: CreationOptional<number>;
  declare workforce_completion: CreationOptional<number>;
  declare inventory_completion: CreationOptional<number>;
  declare vendor_completion: CreationOptional<number>;
  declare overall_completion: CreationOptional<number>;
  declare bucket_data: CreationOptional<Record<string, unknown>>;
  declare reminder_stage: CreationOptional<number>;
  declare last_activity_at?: Date | null;
  declare next_reminder_at?: Date | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  static setup(sequelize: Sequelize) {
    BusinessDiscoveryProfile.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: BUSINESS_DISCOVERY_STATUS.ACTIVE,
        },
        identity_completion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        organization_completion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        manager_completion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        workforce_completion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        inventory_completion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        vendor_completion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        overall_completion: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        bucket_data: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        reminder_stage: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        last_activity_at: DataTypes.DATE,
        next_reminder_at: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'business_discovery_profiles',
        underscored: true,
        timestamps: true,
      },
    );
    return BusinessDiscoveryProfile;
  }

  static associate(models: any) {
    BusinessDiscoveryProfile.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
  }
}
