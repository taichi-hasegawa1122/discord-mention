// サーバーリストを再読み込みするスクリプト
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

async function refreshServers() {
  console.log('=== サーバーリストを再読み込み ===\n');
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on('ready', async () => {
    console.log(`✅ Botがログインしました: ${client.user.tag}\n`);
    
    // サーバーを再取得
    await client.guilds.fetch();
    
    console.log(`参加しているサーバー数: ${client.guilds.cache.size}\n`);
    
    if (client.guilds.cache.size > 0) {
      console.log('参加しているサーバー:');
      client.guilds.cache.forEach(guild => {
        console.log(`  ✅ ${guild.name} (ID: ${guild.id})`);
      });
      console.log('\n✅ サーバーが認識されました！');
      console.log('   ブラウザで http://localhost:3000 にアクセスして確認してください。');
    } else {
      console.log('⚠️  Botが参加しているサーバーがありません');
      console.log('   以下の手順でBotをサーバーに招待してください：');
      console.log('   1. Discord Developer Portal → OAuth2 → URL Generator');
      console.log('   2. Scopes: bot を選択');
      console.log('   3. Bot Permissions: Read Messages/View Channels, Read Message History を選択');
      console.log('   4. 生成されたURLでBotを招待');
    }
    
    client.destroy();
    process.exit(0);
  });

  try {
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ 接続エラー:', error.message);
    process.exit(1);
  }
}

refreshServers();

