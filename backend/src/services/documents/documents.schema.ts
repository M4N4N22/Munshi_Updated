import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import { DOCUMENT_STATUS, DOCUMENT_TYPE } from './documents.constants';

export class Document extends Model<
  InferAttributes<Document>,
  InferCreationAttributes<Document>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare uploaded_by?: number | null;
  declare document_type: string;
  declare status: CreationOptional<string>;
  declare file_name?: string | null;
  declare storage_ref?: string | null;
  declare mime_type?: string | null;
  declare metadata: Record<string, unknown>;

  declare readonly created_at?: Date;
  declare readonly updated_at?: Date;

  static setup(sequelize: Sequelize) {
    Document.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        uploaded_by: DataTypes.INTEGER,
        document_type: {
          type: DataTypes.STRING(64),
          allowNull: false,
          defaultValue: DOCUMENT_TYPE.UNKNOWN,
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: DOCUMENT_STATUS.UPLOADED,
        },
        file_name: DataTypes.STRING(512),
        storage_ref: DataTypes.STRING(1024),
        mime_type: DataTypes.STRING(128),
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        sequelize,
        tableName: 'documents',
        underscored: true,
        timestamps: true,
      },
    );
    return Document;
  }

  static associate(models: any) {
    Document.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    Document.belongsTo(models.User, {
      foreignKey: 'uploaded_by',
      as: 'uploader',
    });
    Document.hasMany(models.DocumentProcessingJob, {
      foreignKey: 'document_id',
      as: 'processing_jobs',
    });
    Document.hasMany(models.DocumentExtraction, {
      foreignKey: 'document_id',
      as: 'extractions',
    });
    Document.hasMany(models.DocumentSuggestion, {
      foreignKey: 'document_id',
      as: 'suggestions',
    });
  }
}

export class DocumentProcessingJob extends Model<
  InferAttributes<DocumentProcessingJob>,
  InferCreationAttributes<DocumentProcessingJob>
> {
  declare id: CreationOptional<number>;
  declare document_id: number;
  declare factory_id: number;
  declare job_type: string;
  declare status: CreationOptional<string>;
  declare error_message?: string | null;
  declare started_at?: Date | null;
  declare completed_at?: Date | null;

  declare readonly created_at?: Date;
  declare readonly updated_at?: Date;

  static setup(sequelize: Sequelize) {
    DocumentProcessingJob.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        document_id: { type: DataTypes.INTEGER, allowNull: false },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        job_type: {
          type: DataTypes.STRING(64),
          allowNull: false,
          defaultValue: 'EXTRACTION',
        },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        error_message: DataTypes.TEXT,
        started_at: DataTypes.DATE,
        completed_at: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'document_processing_jobs',
        underscored: true,
        timestamps: true,
      },
    );
    return DocumentProcessingJob;
  }

  static associate(models: any) {
    DocumentProcessingJob.belongsTo(models.Document, {
      foreignKey: 'document_id',
      as: 'document',
    });
  }
}

export class DocumentExtraction extends Model<
  InferAttributes<DocumentExtraction>,
  InferCreationAttributes<DocumentExtraction>
> {
  declare id: CreationOptional<number>;
  declare document_id: number;
  declare factory_id: number;
  declare extraction_version: string;
  declare document_type_detected?: string | null;
  declare payload: Record<string, unknown>;

  declare readonly created_at?: Date;

  static setup(sequelize: Sequelize) {
    DocumentExtraction.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        document_id: { type: DataTypes.INTEGER, allowNull: false },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        extraction_version: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'v1',
        },
        document_type_detected: DataTypes.STRING(64),
        payload: { type: DataTypes.JSONB, allowNull: false },
      },
      {
        sequelize,
        tableName: 'document_extractions',
        underscored: true,
        timestamps: true,
        updatedAt: false,
      },
    );
    return DocumentExtraction;
  }

  static associate(models: any) {
    DocumentExtraction.belongsTo(models.Document, {
      foreignKey: 'document_id',
      as: 'document',
    });
    DocumentExtraction.hasMany(models.DocumentSuggestion, {
      foreignKey: 'extraction_id',
      as: 'suggestions',
    });
  }
}

export class DocumentSuggestion extends Model<
  InferAttributes<DocumentSuggestion>,
  InferCreationAttributes<DocumentSuggestion>
> {
  declare id: CreationOptional<number>;
  declare document_id: number;
  declare factory_id: number;
  declare extraction_id: number;
  declare suggestion_type: string;
  declare status: CreationOptional<string>;
  declare payload: Record<string, unknown>;
  declare workflow_session_id?: number | null;
  declare rejection_reason?: string | null;
  declare executed_at?: Date | null;

  declare readonly created_at?: Date;
  declare readonly updated_at?: Date;

  static setup(sequelize: Sequelize) {
    DocumentSuggestion.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        document_id: { type: DataTypes.INTEGER, allowNull: false },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        extraction_id: { type: DataTypes.INTEGER, allowNull: false },
        suggestion_type: { type: DataTypes.STRING(64), allowNull: false },
        status: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        payload: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        workflow_session_id: DataTypes.INTEGER,
        rejection_reason: DataTypes.TEXT,
        executed_at: DataTypes.DATE,
      },
      {
        sequelize,
        tableName: 'document_suggestions',
        underscored: true,
        timestamps: true,
      },
    );
    return DocumentSuggestion;
  }

  static associate(models: any) {
    DocumentSuggestion.belongsTo(models.Document, {
      foreignKey: 'document_id',
      as: 'document',
    });
    DocumentSuggestion.belongsTo(models.DocumentExtraction, {
      foreignKey: 'extraction_id',
      as: 'extraction',
    });
  }
}
