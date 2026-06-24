import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

export class AppConfig extends Model<InferAttributes<AppConfig>, InferCreationAttributes<AppConfig>> {
    declare slug: string;
    declare value: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export function initAppConfig(sequelize: Sequelize): typeof AppConfig {
    AppConfig.init(
        {
            slug: { type: DataTypes.TEXT, primaryKey: true },
            value: { type: DataTypes.TEXT, allowNull: false },
            createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
            updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
        },
        { sequelize, tableName: 'app_config', underscored: true },
    );
    return AppConfig;
}
