import { Model, InferAttributes, InferCreationAttributes, DataTypes, Sequelize, CreationOptional } from 'sequelize';

export class FeedMessage extends Model<InferAttributes<FeedMessage>, InferCreationAttributes<FeedMessage>> {
    declare feedId: string;
    declare channelId: string;
    declare messageId: number;
    declare createdAt: CreationOptional<Date>;
}

export function initFeedMessage(sequelize: Sequelize): typeof FeedMessage {
    FeedMessage.init(
        {
            feedId: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
            },
            channelId: {
                type: DataTypes.BIGINT,
                allowNull: false,
                primaryKey: true,
            },
            messageId: {
                type: DataTypes.BIGINT,
                allowNull: false,
                primaryKey: true,
            },
            createdAt: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            tableName: 'feed_messages',
            timestamps: false,
            underscored: true,
        },
    );

    FeedMessage.removeAttribute('id');

    return FeedMessage;
}
