import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class Attendance extends Model<
  InferAttributes<Attendance>,
  InferCreationAttributes<Attendance>
> {
  declare id: CreationOptional<number>;
  declare user_id: number;
  declare factory_id: number;
  declare date: string;
  declare is_present: boolean;

  static setup(sequelize: Sequelize) {
    Attendance.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        factory_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        is_present: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'attendance',
        underscored: true,
        timestamps: true,
        indexes: [
          {
            unique: true,
            fields: ['user_id', 'factory_id', 'date'],
          },
        ],
      },
    );
    return Attendance;
  }

  static associate(models: any) {
    Attendance.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Attendance.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
  }
}
