import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { APPROVAL_STATUS } from './approvals.constants';

export class ApprovalRequest extends Model<
  InferAttributes<ApprovalRequest>,
  InferCreationAttributes<ApprovalRequest>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare entity_type: string;
  declare entity_id: number;
  declare requester_id: number;
  declare approver_id?: number | null;
  declare status: CreationOptional<string>;
  declare remarks?: string | null;
  declare decided_at?: Date | null;

  static setup(sequelize: Sequelize) {
    ApprovalRequest.init(
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
        entity_type: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        entity_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        requester_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        approver_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING,
          defaultValue: APPROVAL_STATUS.PENDING,
        },
        remarks: DataTypes.TEXT,
        decided_at: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'approval_requests',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['factory_id'] },
          { fields: ['factory_id', 'status'] },
          { fields: ['entity_type', 'entity_id'] },
          { fields: ['requester_id'] },
          { fields: ['approver_id'] },
        ],
      },
    );
    return ApprovalRequest;
  }

  static associate(models: any) {
    ApprovalRequest.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    ApprovalRequest.belongsTo(models.User, {
      foreignKey: 'requester_id',
      as: 'requester',
    });
    ApprovalRequest.belongsTo(models.User, {
      foreignKey: 'approver_id',
      as: 'approver',
    });
  }
}
