import { resolve } from 'node:path';
import readline from 'readline';
import { configure, createClient } from 'tdl';
import { getTdjson } from 'prebuilt-tdlib';
import { initDb, upsertChannel, saveMessage } from './db.js';

configure({ tdjson: getTdjson() });

const client = createClient({
  apiId: Number(process.env.TG_API_ID),
  apiHash: process.env.TG_API_HASH!,
  databaseDirectory: resolve(import.meta.dirname, '../../../.tdlib'),
  filesDirectory: resolve(import.meta.dirname, '../../../.tdlib-files'),
});

function readLine(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function handleMessage(chatId: number, msg: any) {
  const chat = (await client.invoke({ _: 'getChat', chat_id: chatId })) as any;
  if (chat.type._ !== 'chatTypeSupergroup' || !chat.type.is_channel) return;

  const supergroup = (await client.invoke({
    _: 'getSupergroup',
    supergroup_id: chat.type.supergroup_id,
  })) as any;

  await upsertChannel(String(chatId), chat.title, supergroup.usernames?.active_usernames?.[0] ?? supergroup.username);

  const saved = await saveMessage(String(chatId), msg.id, msg);
  if (saved) console.log(`[${chat.title}] saved msg ${msg.id}`);

  await client.invoke({
    _: 'viewMessages',
    chat_id: chatId,
    message_ids: [msg.id],
    force_read: true,
  });
}

async function syncUnread() {
  const chatList = (await client.invoke({
    _: 'getChats',
    chat_list: { _: 'chatListMain' },
    limit: 500,
  })) as any;

  for (const chatId of chatList.chat_ids) {
    const chat = (await client.invoke({ _: 'getChat', chat_id: chatId })) as any;
    if (chat.type._ !== 'chatTypeSupergroup' || !chat.type.is_channel) continue;
    if (chat.unread_count === 0) continue;

    console.log(`[${chat.title}] syncing ${chat.unread_count} unread...`);

    const supergroup = (await client.invoke({
      _: 'getSupergroup',
      supergroup_id: chat.type.supergroup_id,
    })) as any;
    await upsertChannel(String(chatId), chat.title, supergroup.usernames?.active_usernames?.[0] ?? supergroup.username);

    const history = (await client.invoke({
      _: 'getChatHistory',
      chat_id: chatId,
      from_message_id: 0,
      offset: 0,
      limit: Math.min(chat.unread_count, 100),
      only_local: false,
    })) as any;

    const messageIds: number[] = [];
    for (const msg of history.messages ?? []) {
      if (msg.id <= chat.last_read_inbox_message_id) continue;
      const saved = await saveMessage(String(chatId), msg.id, msg);
      if (saved) console.log(`  saved msg ${msg.id}`);
      messageIds.push(msg.id);
    }

    if (messageIds.length > 0) {
      await client.invoke({
        _: 'viewMessages',
        chat_id: chatId,
        message_ids: messageIds,
        force_read: true,
      });
    }
  }
}

async function main() {
  await initDb();
  console.log('DB ready');

  await client.login({
    getPhoneNumber: (retry) => {
      if (retry) return readLine('Phone number (retry): ');
      return Promise.resolve(process.env.TG_PHONE!);
    },
    getAuthCode: (retry) => {
      if (retry) console.log('Invalid code, try again.');
      return readLine('Code (check Telegram app): ');
    },
    getPassword: (hint, retry) => {
      if (retry) console.log('Invalid password, try again.');
      return readLine(`2FA password (hint: ${hint}): `);
    },
  });

  console.log('Telegram connected, syncing unread...');
  await syncUnread();
  console.log('Sync done, listening for new messages...');

  client.on('update', (update: any) => {
    if (update._ !== 'updateNewMessage') return;
    const msg = update.message;
    if (!msg?.chat_id) return;
    handleMessage(msg.chat_id, msg).catch((e: any) =>
      console.error(`Error handling msg in ${msg.chat_id}:`, e.message ?? e),
    );
  });

  // Keep alive
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await client.close();
    process.exit(0);
  });
}

main().catch(console.error);
