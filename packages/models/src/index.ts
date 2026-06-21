import { Sequelize } from 'sequelize';
import { Channel, initChannel } from './Channel.js';
import { Message, initMessage } from './Message.js';
import { Feed, initFeed } from './Feed.js';

export function initModels(sequelize: Sequelize) {
  initChannel(sequelize);
  initMessage(sequelize);
  initFeed(sequelize);

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
}

export { Channel, Message, Feed };