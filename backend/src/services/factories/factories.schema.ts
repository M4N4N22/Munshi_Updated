import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { USER_ROLE } from '../users/users.constants';

export class Factory extends Model<
  InferAttributes<Factory>,
  InferCreationAttributes<Factory>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare address?: string;

  static setup(sequelize: Sequelize) {
    Factory.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        address: DataTypes.STRING,
      },
      {
        sequelize,
        tableName: 'factories',
        underscored: true,
        timestamps: true,
      },
    );
    return Factory;
  }

  static associate(models: any) {
    Factory.hasMany(models.FactoryUser, {
      foreignKey: 'factory_id',
      as: 'members',
    });

    Factory.hasMany(models.Task, {
      foreignKey: 'factory_id',
      as: 'tasks',
    });

    Factory.hasMany(models.Issue, {
      foreignKey: 'factory_id',
      as: 'issues',
    });

    Factory.hasMany(models.Attendance, {
      foreignKey: 'factory_id',
      as: 'attendance',
    });

    Factory.hasMany(models.Department, {
      foreignKey: 'factory_id',
      as: 'departments',
    });

    Factory.hasMany(models.Vendor, {
      foreignKey: 'factory_id',
      as: 'vendors',
    });

    Factory.hasMany(models.InventoryCategory, {
      foreignKey: 'factory_id',
      as: 'inventory_categories',
    });

    Factory.hasMany(models.InventoryLocation, {
      foreignKey: 'factory_id',
      as: 'inventory_locations',
    });

    Factory.hasMany(models.InventoryItem, {
      foreignKey: 'factory_id',
      as: 'inventory_items',
    });

    Factory.hasMany(models.InventoryTransaction, {
      foreignKey: 'factory_id',
      as: 'inventory_transactions',
    });

    Factory.hasMany(models.PurchaseRequest, {
      foreignKey: 'factory_id',
      as: 'purchase_requests',
    });

    Factory.hasMany(models.ApprovalRequest, {
      foreignKey: 'factory_id',
      as: 'approval_requests',
    });

    Factory.hasMany(models.WorkflowSession, {
      foreignKey: 'factory_id',
      as: 'workflow_sessions',
    });
  }
}

export class FactoryUser extends Model<
  InferAttributes<FactoryUser>,
  InferCreationAttributes<FactoryUser>
> {
  declare id: CreationOptional<number>;
  declare user_id: number;
  declare factory_id: number;
  declare role: USER_ROLE;
  declare doj?: Date;

  static setup(sequelize: Sequelize) {
    FactoryUser.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        doj: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'factory_users',
        underscored: true,
        timestamps: true,
      },
    );
    return FactoryUser;
  }

  static associate(models: any) {
    FactoryUser.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
    });

    FactoryUser.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
      onDelete: 'CASCADE',
    });
  }
}
