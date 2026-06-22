import { Sequelize } from 'sequelize';
import { Channel, initChannel } from './Channel.js';
import { initMessage, Message } from './Message.js';
import { Feed, initFeed } from './Feed.js';
import type { SimilarFeedItem } from './Feed.js';
import { FeedMessage, initFeedMessage } from './FeedMessage.js';

export function initDb(databaseUrl: string) {
    const sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        logging: false,
    });

    initModels(sequelize);
    return sequelize;
}

export function initModels(sequelize: Sequelize) {
    initChannel(sequelize);
    initMessage(sequelize);
    initFeed(sequelize);
    initFeedMessage(sequelize);

    Channel.hasMany(Message, {
        foreignKey: 'channelId',
        as: 'messages',
    });
    Message.belongsTo(Channel, {
        foreignKey: 'channelId',
        as: 'channel',
    });

    Channel.hasMany(Feed, {
        foreignKey: 'channelId',
        as: 'feedItems',
    });
    Feed.belongsTo(Channel, {
        foreignKey: 'channelId',
        as: 'channel',
    });

    Feed.hasMany(FeedMessage, {
        foreignKey: 'feedId',
        as: 'feedMessages',
    });
    FeedMessage.belongsTo(Feed, {
        foreignKey: 'feedId',
        as: 'feed',
    });
}

export { Channel, Message, Feed, FeedMessage };
export type { SimilarFeedItem };
