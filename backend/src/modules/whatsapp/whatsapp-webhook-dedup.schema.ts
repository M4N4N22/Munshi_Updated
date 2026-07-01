import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class WhatsAppWebhookEvent extends Model<
  InferAttributes<WhatsAppWebhookEvent>,
  InferCreationAttributes<WhatsAppWebhookEvent>
> {
  declare id: CreationOptional<number>;
  declare provider_message_id: string;
  declare event_kind: string;
  declare from_phone: string | null;
  declare processed_at: Date;

  declare readonly created_at?: Date;

  static setup(sequelize: Sequelize) {
    WhatsAppWebhookEvent.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        provider_message_id: {
          type: DataTypes.STRING(256),
          allowNull: false,
        },
        event_kind: {
          type: DataTypes.STRING(32),
          allowNull: false,
        },
        from_phone: {
          type: DataTypes.STRING(32),
          allowNull: true,
        },
        processed_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: 'whatsapp_webhook_events',
        underscored: true,
        timestamps: true,
        updatedAt: false,
      },
    );
    return WhatsAppWebhookEvent;
  }
}
