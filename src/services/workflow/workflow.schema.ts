import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { WORKFLOW_STATUS } from './workflow.constants';

export class WorkflowSession extends Model<
  InferAttributes<WorkflowSession>,
  InferCreationAttributes<WorkflowSession>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare phone_number: string;
  declare workflow_type: string;
  declare current_step: string;
  declare session_data: Record<string, unknown>;
  declare status: CreationOptional<string>;

  declare readonly created_at?: Date;
  declare readonly updated_at?: Date;

  static setup(sequelize: Sequelize) {
    WorkflowSession.init(
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
        phone_number: {
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        workflow_type: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        current_step: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        session_data: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: WORKFLOW_STATUS.ACTIVE,
        },
      },
      {
        sequelize,
        tableName: 'workflow_sessions',
        underscored: true,
        timestamps: true,
      },
    );
    return WorkflowSession;
  }

  static associate(models: any) {
    WorkflowSession.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
  }
}
