import { Model, InferAttributes, InferCreationAttributes, CreationOptional, DataTypes, Sequelize } from 'sequelize';

export class Feed extends Model<InferAttributes<Feed>, InferCreationAttributes<Feed>> {
  declare id: CreationOptional<string>;
  declare text: string;
  declare isViewed: CreationOptional<boolean>;
  declare firstSeenAt: Date;
  declare channelId: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export function initFeed(sequelize: Sequelize): typeof Feed {
  Feed.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isViewed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      firstSeenAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      channelId: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'feed',
      timestamps: true,
      underscored: true,
    },
  );
  return Feed;
}
