import { Sequelize } from 'sequelize';
import { Channel, initChannel } from './Channel.js';
import { Message, initMessage } from './Message.js';

export function initModels(sequelize: Sequelize) {
  initChannel(sequelize);
  initMessage(sequelize);

  Channel.hasMany(Message, {
    foreignKey: 'channelId',
    as: 'messages',
  });
  Message.belongsTo(Channel, {
    foreignKey: 'channelId',
    as: 'channel',
  });
}

export { Channel, Message };