import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class Issue extends Model<
  InferAttributes<Issue>,
  InferCreationAttributes<Issue>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare reported_by: number;
  declare message: string;
  declare is_resolved: CreationOptional<boolean>;

  static setup(sequelize: Sequelize) {
    Issue.init(
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
        reported_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        is_resolved: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
      },
      {
        sequelize,
        tableName: 'issues',
        underscored: true,
        timestamps: true,
      },
    );
    return Issue;
  }

  static associate(models: any) {
    Issue.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });

    Issue.belongsTo(models.User, {
      foreignKey: 'reported_by',
      as: 'reporter',
    });
  }
}
