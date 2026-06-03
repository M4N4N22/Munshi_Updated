import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class DomainEvent extends Model<
  InferAttributes<DomainEvent>,
  InferCreationAttributes<DomainEvent>
> {
  declare id: CreationOptional<number>;
  declare factory_id?: number | null;
  declare event_type: string;
  declare aggregate_type: string;
  declare aggregate_id: string;
  declare payload: object;
  declare status: string;
  declare attempts: CreationOptional<number>;
  declare last_error?: string | null;
  declare scheduled_at: Date;
  declare processed_at?: Date | null;

  static setup(sequelize: Sequelize) {
    DomainEvent.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        factory_id: DataTypes.INTEGER,
        event_type: { type: DataTypes.STRING(128), allowNull: false },
        aggregate_type: { type: DataTypes.STRING(64), allowNull: false },
        aggregate_id: { type: DataTypes.STRING(64), allowNull: false },
        payload: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        last_error: DataTypes.TEXT,
        scheduled_at: { type: DataTypes.DATE, allowNull: false },
        processed_at: DataTypes.DATE,
      },
      { sequelize, tableName: 'domain_events', underscored: true, timestamps: true },
    );
    return DomainEvent;
  }
}
