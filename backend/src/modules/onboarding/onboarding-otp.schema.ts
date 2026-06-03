import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

export class OnboardingOtpChallenge extends Model<
  InferAttributes<OnboardingOtpChallenge>,
  InferCreationAttributes<OnboardingOtpChallenge>
> {
  declare phone_number: string;
  declare code_hash: string;
  declare expires_at: Date;
  declare attempts: CreationOptional<number>;
  declare last_sent_at: Date;

  static setup(sequelize: Sequelize) {
    OnboardingOtpChallenge.init(
      {
        phone_number: {
          type: DataTypes.STRING(20),
          primaryKey: true,
        },
        code_hash: {
          type: DataTypes.STRING(64),
          allowNull: false,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        last_sent_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'onboarding_otp_challenges',
        underscored: true,
        timestamps: true,
      },
    );
    return OnboardingOtpChallenge;
  }
}

export class OnboardingPhoneVerification extends Model<
  InferAttributes<OnboardingPhoneVerification>,
  InferCreationAttributes<OnboardingPhoneVerification>
> {
  declare phone_number: string;
  declare verified_at: Date;
  declare expires_at: Date;

  static setup(sequelize: Sequelize) {
    OnboardingPhoneVerification.init(
      {
        phone_number: {
          type: DataTypes.STRING(20),
          primaryKey: true,
        },
        verified_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        tableName: 'onboarding_phone_verifications',
        underscored: true,
        timestamps: true,
        updatedAt: false,
      },
    );
    return OnboardingPhoneVerification;
  }
}
