import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<number>;
  declare name?: string;
  declare phone_number: string;
  declare profile_picture?: string;

  declare readonly created_at?: Date;
  declare readonly updated_at?: Date;

  static setup(sequelize: Sequelize) {
    User.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        phone_number: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        name: DataTypes.STRING,
        profile_picture: DataTypes.STRING,
      },
      {
        sequelize,
        tableName: 'users',
        underscored: true,
        timestamps: true,
      },
    );
    return User;
  }

  static associate(models: any) {
    User.hasOne(models.FactoryUser, {
      foreignKey: 'user_id',
      as: 'factory_links',
    });

    User.hasMany(models.Task, {
      foreignKey: 'assigned_to',
      as: 'assigned_tasks',
    });

    User.hasMany(models.Task, {
      foreignKey: 'assigned_by',
      as: 'created_tasks',
    });

    User.hasMany(models.Issue, {
      foreignKey: 'reported_by',
      as: 'reported_issues',
    });

    User.hasMany(models.PurchaseRequest, {
      foreignKey: 'requested_by',
      as: 'purchase_requests',
    });

    User.hasMany(models.ApprovalRequest, {
      foreignKey: 'requester_id',
      as: 'approval_requests_submitted',
    });

    User.hasMany(models.ApprovalRequest, {
      foreignKey: 'approver_id',
      as: 'approval_requests_assigned',
    });

    User.hasMany(models.InventoryTransaction, {
      foreignKey: 'created_by',
      as: 'inventory_transactions',
    });
  }
}
