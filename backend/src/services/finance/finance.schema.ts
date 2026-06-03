import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class BankConsent extends Model<
  InferAttributes<BankConsent>,
  InferCreationAttributes<BankConsent>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare user_id: number;
  declare aa_consent_id: string;
  declare aa_customer_id?: string | null;
  declare status: string;
  declare consent_start_at?: Date | null;
  declare consent_end_at?: Date | null;
  declare raw_consent?: object | null;

  static setup(sequelize: Sequelize) {
    BankConsent.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        aa_consent_id: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        aa_customer_id: DataTypes.STRING(255),
        status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'PENDING' },
        consent_start_at: DataTypes.DATE,
        consent_end_at: DataTypes.DATE,
        raw_consent: DataTypes.JSONB,
      },
      { sequelize, tableName: 'bank_consents', underscored: true, timestamps: true },
    );
    return BankConsent;
  }
}

export class BankAccount extends Model<
  InferAttributes<BankAccount>,
  InferCreationAttributes<BankAccount>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare bank_consent_id?: number | null;
  declare masked_account_number: string;
  declare account_ref: string;
  declare bank_name?: string | null;
  declare account_type?: string | null;
  declare ifsc?: string | null;
  declare is_primary: CreationOptional<boolean>;

  static setup(sequelize: Sequelize) {
    BankAccount.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        bank_consent_id: DataTypes.INTEGER,
        masked_account_number: { type: DataTypes.STRING(32), allowNull: false },
        account_ref: { type: DataTypes.STRING(255), allowNull: false },
        bank_name: DataTypes.STRING(255),
        account_type: DataTypes.STRING(32),
        ifsc: DataTypes.STRING(16),
        is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      },
      { sequelize, tableName: 'bank_accounts', underscored: true, timestamps: true },
    );
    return BankAccount;
  }

  static associate(models: any) {
    BankAccount.belongsTo(models.BankConsent, {
      foreignKey: 'bank_consent_id',
      as: 'consent',
    });
  }
}

export class BankTransaction extends Model<
  InferAttributes<BankTransaction>,
  InferCreationAttributes<BankTransaction>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare bank_account_id: number;
  declare fetch_batch_id: string;
  declare external_txn_id: string;
  declare txn_date: string;
  declare value_date?: string | null;
  declare amount: string;
  declare direction: string;
  declare balance_after?: string | null;
  declare narration?: string | null;
  declare counterparty_name?: string | null;
  declare counterparty_raw?: object | null;
  declare raw_payload?: object | null;
  declare parsed_at?: Date | null;

  static setup(sequelize: Sequelize) {
    BankTransaction.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        bank_account_id: { type: DataTypes.INTEGER, allowNull: false },
        fetch_batch_id: { type: DataTypes.STRING(64), allowNull: false },
        external_txn_id: { type: DataTypes.STRING(255), allowNull: false },
        txn_date: { type: DataTypes.DATEONLY, allowNull: false },
        value_date: DataTypes.DATEONLY,
        amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
        direction: { type: DataTypes.STRING(8), allowNull: false },
        balance_after: DataTypes.DECIMAL(18, 2),
        narration: DataTypes.TEXT,
        counterparty_name: DataTypes.STRING(255),
        counterparty_raw: DataTypes.JSONB,
        raw_payload: DataTypes.JSONB,
        parsed_at: DataTypes.DATE,
      },
      { sequelize, tableName: 'bank_transactions', underscored: true, timestamps: true },
    );
    return BankTransaction;
  }

  static associate(models: any) {
    BankTransaction.belongsTo(models.BankAccount, {
      foreignKey: 'bank_account_id',
      as: 'bank_account',
    });
  }
}

export class LedgerAccount extends Model<
  InferAttributes<LedgerAccount>,
  InferCreationAttributes<LedgerAccount>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare code: string;
  declare name: string;
  declare account_type: string;
  declare parent_id?: number | null;
  declare is_system: CreationOptional<boolean>;

  static setup(sequelize: Sequelize) {
    LedgerAccount.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        code: { type: DataTypes.STRING(32), allowNull: false },
        name: { type: DataTypes.STRING(255), allowNull: false },
        account_type: { type: DataTypes.STRING(32), allowNull: false },
        parent_id: DataTypes.INTEGER,
        is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      },
      { sequelize, tableName: 'ledger_accounts', underscored: true, timestamps: true },
    );
    return LedgerAccount;
  }
}

export class JournalEntry extends Model<
  InferAttributes<JournalEntry>,
  InferCreationAttributes<JournalEntry>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare entry_date: string;
  declare description?: string | null;
  declare source_type: string;
  declare source_ref?: string | null;
  declare status: string;
  declare reversed_entry_id?: number | null;
  declare created_by_user_id?: number | null;
  declare posted_at?: Date | null;

  static setup(sequelize: Sequelize) {
    JournalEntry.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        entry_date: { type: DataTypes.DATEONLY, allowNull: false },
        description: DataTypes.TEXT,
        source_type: { type: DataTypes.STRING(64), allowNull: false },
        source_ref: DataTypes.STRING(255),
        status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'DRAFT' },
        reversed_entry_id: DataTypes.INTEGER,
        created_by_user_id: DataTypes.INTEGER,
        posted_at: DataTypes.DATE,
      },
      { sequelize, tableName: 'journal_entries', underscored: true, timestamps: true },
    );
    return JournalEntry;
  }

  static associate(models: any) {
    JournalEntry.hasMany(models.JournalLine, {
      foreignKey: 'journal_entry_id',
      as: 'lines',
    });
  }
}

export class JournalLine extends Model<
  InferAttributes<JournalLine>,
  InferCreationAttributes<JournalLine>
> {
  declare id: CreationOptional<number>;
  declare journal_entry_id: number;
  declare ledger_account_id: number;
  declare debit_amount: CreationOptional<string>;
  declare credit_amount: CreationOptional<string>;
  declare memo?: string | null;

  static setup(sequelize: Sequelize) {
    JournalLine.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        journal_entry_id: { type: DataTypes.INTEGER, allowNull: false },
        ledger_account_id: { type: DataTypes.INTEGER, allowNull: false },
        debit_amount: {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: false,
          defaultValue: 0,
        },
        credit_amount: {
          type: DataTypes.DECIMAL(18, 2),
          allowNull: false,
          defaultValue: 0,
        },
        memo: DataTypes.TEXT,
      },
      { sequelize, tableName: 'journal_lines', underscored: true, timestamps: true },
    );
    return JournalLine;
  }

  static associate(models: any) {
    JournalLine.belongsTo(models.JournalEntry, {
      foreignKey: 'journal_entry_id',
      as: 'entry',
    });
    JournalLine.belongsTo(models.LedgerAccount, {
      foreignKey: 'ledger_account_id',
      as: 'ledger_account',
    });
  }
}

export class MatchSuggestion extends Model<
  InferAttributes<MatchSuggestion>,
  InferCreationAttributes<MatchSuggestion>
> {
  declare id: CreationOptional<number>;
  declare factory_id: number;
  declare bank_transaction_id: number;
  declare vendor_id?: number | null;
  declare purchase_request_id?: number | null;
  declare journal_entry_id?: number | null;
  declare confidence_score: string;
  declare status: string;
  declare match_reason?: string | null;
  declare owner_feedback?: string | null;

  static setup(sequelize: Sequelize) {
    MatchSuggestion.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        factory_id: { type: DataTypes.INTEGER, allowNull: false },
        bank_transaction_id: { type: DataTypes.INTEGER, allowNull: false },
        vendor_id: DataTypes.INTEGER,
        purchase_request_id: DataTypes.INTEGER,
        journal_entry_id: DataTypes.INTEGER,
        confidence_score: { type: DataTypes.DECIMAL(5, 4), allowNull: false },
        status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'PENDING' },
        match_reason: DataTypes.TEXT,
        owner_feedback: DataTypes.TEXT,
      },
      { sequelize, tableName: 'match_suggestions', underscored: true, timestamps: true },
    );
    return MatchSuggestion;
  }

  static associate(models: any) {
    MatchSuggestion.belongsTo(models.BankTransaction, {
      foreignKey: 'bank_transaction_id',
      as: 'bank_transaction',
    });
  }
}
