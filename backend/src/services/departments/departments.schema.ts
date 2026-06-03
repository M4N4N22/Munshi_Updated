import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class Department extends Model<
  InferAttributes<Department>,
  InferCreationAttributes<Department>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare name: string;
  declare slug: string;
  declare manager_user_id: number;

  static setup(sequelize: Sequelize) {
    Department.init(
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
        slug: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        manager_user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'departments',
        underscored: true,
        timestamps: true,
        indexes: [
          { unique: true, fields: ['factory_id', 'slug'] },
          { unique: true, fields: ['factory_id', 'manager_user_id'] },
        ],
      },
    );
    return Department;
  }

  static associate(models: any) {
    Department.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    Department.belongsTo(models.User, {
      foreignKey: 'manager_user_id',
      as: 'manager',
    });
    Department.hasMany(models.DepartmentWorker, {
      foreignKey: 'department_id',
      as: 'department_workers',
    });
  }
}

export class DepartmentWorker extends Model<
  InferAttributes<DepartmentWorker>,
  InferCreationAttributes<DepartmentWorker>
> {
  declare id: CreationOptional<number>;
  declare department_id: number;
  declare user_id: number;

  static setup(sequelize: Sequelize) {
    DepartmentWorker.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        department_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: true,
        },
      },
      {
        sequelize,
        tableName: 'department_workers',
        underscored: true,
        timestamps: true,
      },
    );
    return DepartmentWorker;
  }

  static associate(models: any) {
    DepartmentWorker.belongsTo(models.Department, {
      foreignKey: 'department_id',
      as: 'department',
      onDelete: 'CASCADE',
    });
    DepartmentWorker.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
    });
  }
}
