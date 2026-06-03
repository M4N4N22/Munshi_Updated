import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';
import {
  PURCHASE_REQUEST_PRIORITY,
  PURCHASE_REQUEST_STATUS,
} from './purchase-requests.constants';

export class PurchaseRequest extends Model<
  InferAttributes<PurchaseRequest>,
  InferCreationAttributes<PurchaseRequest>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare request_number: CreationOptional<string | null>;
  declare title: string;
  declare description?: string | null;
  declare status: CreationOptional<string>;
  declare requested_by: number;
  declare approved_by?: number | null;
  declare assigned_vendor_id?: number | null;
  declare priority: CreationOptional<string>;
  declare requested_at?: Date | null;
  declare approved_at?: Date | null;
  declare closed_at?: Date | null;
  declare notes?: string | null;
  declare readonly createdAt?: Date;
  declare readonly updatedAt?: Date;

  static setup(sequelize: Sequelize) {
    PurchaseRequest.init(
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
        request_number: {
          type: DataTypes.STRING(64),
          allowNull: true,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: DataTypes.TEXT,
        status: {
          type: DataTypes.STRING(64),
          defaultValue: PURCHASE_REQUEST_STATUS.DRAFT,
        },
        requested_by: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        approved_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        assigned_vendor_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        priority: {
          type: DataTypes.STRING(32),
          defaultValue: PURCHASE_REQUEST_PRIORITY.NORMAL,
        },
        requested_at: DataTypes.DATE,
        approved_at: DataTypes.DATE,
        closed_at: DataTypes.DATE,
        notes: DataTypes.TEXT,
      },
      {
        sequelize,
        tableName: 'purchase_requests',
        underscored: true,
        timestamps: true,
        indexes: [
          { fields: ['factory_id'] },
          { fields: ['factory_id', 'status'] },
          { fields: ['requested_by'] },
          { fields: ['assigned_vendor_id'] },
          { fields: ['factory_id', 'priority'] },
        ],
      },
    );
    return PurchaseRequest;
  }

  static associate(models: any) {
    PurchaseRequest.belongsTo(models.Factory, {
      foreignKey: 'factory_id',
      as: 'factory',
    });
    PurchaseRequest.belongsTo(models.User, {
      foreignKey: 'requested_by',
      as: 'requester',
    });
    PurchaseRequest.belongsTo(models.User, {
      foreignKey: 'approved_by',
      as: 'approver',
    });
    PurchaseRequest.belongsTo(models.Vendor, {
      foreignKey: 'assigned_vendor_id',
      as: 'vendor',
    });
    PurchaseRequest.hasMany(models.PurchaseRequestItem, {
      foreignKey: 'purchase_request_id',
      as: 'items',
    });
    PurchaseRequest.hasMany(models.PurchaseRequestAudit, {
      foreignKey: 'purchase_request_id',
      as: 'audit_events',
    });
  }
}

export class PurchaseRequestItem extends Model<
  InferAttributes<PurchaseRequestItem>,
  InferCreationAttributes<PurchaseRequestItem>
> {
  declare id: CreationOptional<number>;
  declare purchase_request_id: number;
  declare inventory_item_id?: number | null;
  declare item_name: string;
  declare requested_quantity: string;
  declare unit: CreationOptional<string>;
  declare notes?: string | null;

  static setup(sequelize: Sequelize) {
    PurchaseRequestItem.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        purchase_request_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        inventory_item_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        item_name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        requested_quantity: {
          type: DataTypes.DECIMAL(18, 4),
          allowNull: false,
        },
        unit: {
          type: DataTypes.STRING(64),
          allowNull: false,
          defaultValue: 'pcs',
        },
        notes: DataTypes.TEXT,
      },
      {
        sequelize,
        tableName: 'purchase_request_items',
        underscored: true,
        timestamps: true,
      },
    );
    return PurchaseRequestItem;
  }

  static associate(models: any) {
    PurchaseRequestItem.belongsTo(models.PurchaseRequest, {
      foreignKey: 'purchase_request_id',
      as: 'purchase_request',
    });
    PurchaseRequestItem.belongsTo(models.InventoryItem, {
      foreignKey: 'inventory_item_id',
      as: 'inventory_item',
    });
  }
}

export class PurchaseRequestAudit extends Model<
  InferAttributes<PurchaseRequestAudit>,
  InferCreationAttributes<PurchaseRequestAudit>
> {
  declare id: CreationOptional<number>;
  declare purchase_request_id: number;
  declare event_type: string;
  declare performed_by?: number | null;
  declare metadata: CreationOptional<Record<string, unknown>>;
  declare readonly created_at?: Date;

  static setup(sequelize: Sequelize) {
    PurchaseRequestAudit.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        purchase_request_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        event_type: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        performed_by: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        metadata: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
        },
      },
      {
        sequelize,
        tableName: 'purchase_request_audit',
        underscored: true,
        timestamps: true,
        updatedAt: false,
        createdAt: 'created_at',
      },
    );
    return PurchaseRequestAudit;
  }

  static associate(models: any) {
    PurchaseRequestAudit.belongsTo(models.PurchaseRequest, {
      foreignKey: 'purchase_request_id',
      as: 'purchase_request',
    });
    PurchaseRequestAudit.belongsTo(models.User, {
      foreignKey: 'performed_by',
      as: 'performer',
    });
  }
}
