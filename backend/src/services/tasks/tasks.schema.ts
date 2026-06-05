import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
export class Task extends Model<
  InferAttributes<Task>,
  InferCreationAttributes<Task>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare assigned_to: number;
  declare assigned_by: number;
  declare description: string;
  declare deadline?: Date;
  declare deadline_breach_reminded_at?: Date | null;
  declare routing_status?: string | null;
  declare owner_id?: number | null;
  declare department_id?: number | null;
  declare completed_by?: number | null;
  declare rejected_by?: number | null;
  declare rejection_reason?: string | null;
  declare rejected_at?: Date | null;
  declare is_completed: CreationOptional<boolean>;
  declare batch_id?: string;

  static setup(sequelize: Sequelize) {
    Task.init(
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
        assigned_to: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        assigned_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        deadline: DataTypes.DATE,
        deadline_breach_reminded_at: DataTypes.DATE,
        routing_status: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        owner_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        department_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        completed_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        rejected_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        rejection_reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        rejected_at: DataTypes.DATE,
        is_completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        batch_id: DataTypes.UUID,
      },
      {
        sequelize,
        tableName: 'tasks',
        underscored: true,
        timestamps: true,
      },
    );
    return Task;
  }

  static associate(models: any) {
    Task.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignee' });
    Task.belongsTo(models.User, { foreignKey: 'assigned_by', as: 'assigner' });
    Task.belongsTo(models.User, { foreignKey: 'owner_id', as: 'owner' });
    Task.belongsTo(models.User, {
      foreignKey: 'completed_by',
      as: 'completed_by_user',
    });
    Task.belongsTo(models.User, {
      foreignKey: 'rejected_by',
      as: 'rejected_by_user',
    });
    Task.belongsTo(models.Factory, { foreignKey: 'factory_id', as: 'factory' });
    Task.belongsTo(models.Department, {
      foreignKey: 'department_id',
      as: 'department',
    });

    Task.hasMany(models.TaskUpdate, { foreignKey: 'task_id', as: 'updates' });
    Task.hasMany(models.TaskInventoryLine, {
      foreignKey: 'task_id',
      as: 'inventory_lines',
    });
  }
}

export class TaskUpdate extends Model<
  InferAttributes<TaskUpdate>,
  InferCreationAttributes<TaskUpdate>
> {
  declare id: CreationOptional<number>;
  declare task_id: number;
  declare user_id: number;
  declare message: string;

  static setup(sequelize: Sequelize) {
    TaskUpdate.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        task_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'task_updates',
        underscored: true,
        timestamps: true,
      },
    );
    return TaskUpdate;
  }

  static associate(models: any) {
    TaskUpdate.belongsTo(models.Task, {
      foreignKey: 'task_id',
      as: 'task',
      onDelete: 'CASCADE',
    });

    TaskUpdate.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }
}

export class TaskInventoryLine extends Model<
  InferAttributes<TaskInventoryLine>,
  InferCreationAttributes<TaskInventoryLine>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare task_id: number;
  declare inventory_item_id: number;
  declare quantity_expected: string;
  declare quantity_completed: CreationOptional<string>;
  declare movement_type: string;

  static setup(sequelize: Sequelize) {
    TaskInventoryLine.init(
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
        task_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        inventory_item_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        quantity_expected: {
          type: DataTypes.DECIMAL(18, 4),
          allowNull: false,
        },
        quantity_completed: {
          type: DataTypes.DECIMAL(18, 4),
          allowNull: false,
          defaultValue: 0,
        },
        movement_type: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'task_inventory_lines',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['task_id'] },
          { fields: ['inventory_item_id'] },
          { fields: ['factory_id'] },
        ],
      },
    );
    return TaskInventoryLine;
  }

  static associate(models: any) {
    TaskInventoryLine.belongsTo(models.Task, {
      foreignKey: 'task_id',
      as: 'task',
      onDelete: 'CASCADE',
    });

    TaskInventoryLine.belongsTo(models.InventoryItem, {
      foreignKey: 'inventory_item_id',
      as: 'inventory_item',
    });
  }
}
