import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, Sequelize } from 'sequelize';

export class Channel extends Model<InferAttributes<Channel>, InferCreationAttributes<Channel>> {
    declare id: string;
    declare title: string;
    declare username: string | null;
    declare createdAt: CreationOptional<Date>;
}

export function initChannel(sequelize: Sequelize): typeof Channel {
    Channel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                primaryKey: true,
            },
            title: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            username: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            tableName: 'channels',
            timestamps: false,
            underscored: true,
        },
    );
    return Channel;
}
