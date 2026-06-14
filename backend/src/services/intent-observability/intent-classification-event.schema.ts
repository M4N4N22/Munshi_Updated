import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class IntentClassificationEvent extends Model<
  InferAttributes<IntentClassificationEvent>,
  InferCreationAttributes<IntentClassificationEvent>
> {
  declare id: CreationOptional<number>;
  declare event_id: string;
  declare trace_id: string;
  declare schema_version: string;

  declare factory_id: number | null;
  declare user_id: number | null;
  declare user_role: string | null;
  declare phone_hash: string;

  declare raw_length: number;
  declare raw_hash: string;
  declare raw_redacted: string | null;
  declare provider_message_id: string | null;

  declare inbound_path: string;

  declare predicted_intent: string | null;
  declare classification_stage: string | null;
  declare llm_invoked: boolean;
  declare llm_raw_intent: string | null;
  declare post_rule_applied: string[];
  declare classification_latency_ms: number | null;

  declare worker_slug: string | null;
  declare depart_slug: string | null;
  declare task_id: number | null;
  declare task_description: string | null;
  declare deadline: string | null;

  declare command_executed: string | null;
  declare outcome: string;
  declare outcome_detail: string | null;
  declare role_block: boolean;
  declare workflow_started: boolean;
  declare workflow_id: number | null;
  declare is_general_chat: boolean;

  declare retry_within_60s: boolean;
  declare retry_of_event_id: string | null;
  declare misclass_score: number;
  declare reviewed_at: Date | null;

  declare readonly created_at?: Date;

  static setup(sequelize: Sequelize) {
    IntentClassificationEvent.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        event_id: {
          type: DataTypes.UUID,
          allowNull: false,
          unique: true,
        },
        trace_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        schema_version: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: '1.0',
        },
        factory_id: { type: DataTypes.INTEGER, allowNull: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        user_role: { type: DataTypes.STRING(32), allowNull: true },
        phone_hash: { type: DataTypes.STRING(64), allowNull: false },
        raw_length: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        raw_hash: { type: DataTypes.STRING(64), allowNull: false },
        raw_redacted: { type: DataTypes.TEXT, allowNull: true },
        provider_message_id: { type: DataTypes.STRING(256), allowNull: true },
        inbound_path: { type: DataTypes.STRING(64), allowNull: false },
        predicted_intent: { type: DataTypes.STRING(64), allowNull: true },
        classification_stage: { type: DataTypes.STRING(64), allowNull: true },
        llm_invoked: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        llm_raw_intent: { type: DataTypes.STRING(64), allowNull: true },
        post_rule_applied: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        classification_latency_ms: { type: DataTypes.INTEGER, allowNull: true },
        worker_slug: { type: DataTypes.STRING(128), allowNull: true },
        depart_slug: { type: DataTypes.STRING(128), allowNull: true },
        task_id: { type: DataTypes.INTEGER, allowNull: true },
        task_description: { type: DataTypes.TEXT, allowNull: true },
        deadline: { type: DataTypes.STRING(64), allowNull: true },
        command_executed: { type: DataTypes.STRING(64), allowNull: true },
        outcome: { type: DataTypes.STRING(64), allowNull: false },
        outcome_detail: { type: DataTypes.TEXT, allowNull: true },
        role_block: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        workflow_started: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        workflow_id: { type: DataTypes.INTEGER, allowNull: true },
        is_general_chat: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        retry_within_60s: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        retry_of_event_id: { type: DataTypes.UUID, allowNull: true },
        misclass_score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        reviewed_at: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        tableName: 'intent_classification_events',
        underscored: true,
        timestamps: true,
        updatedAt: false,
      },
    );
    return IntentClassificationEvent;
  }
}
