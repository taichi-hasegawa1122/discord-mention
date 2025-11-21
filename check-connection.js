// 接続確認用スクリプト
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

async function checkConnection() {
  console.log('=== Discord Bot接続確認 ===\n');
  
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ エラー: DISCORD_TOKENが.envファイルに設定されていません');
    process.exit(1);
  }

  console.log('✅ .envファイルからトークンを読み込みました');
  console.log(`トークン（最初の20文字）: ${process.env.DISCORD_TOKEN.substring(0, 20)}...\n`);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.on('ready', () => {
    console.log('✅ Discord Botに接続成功！');
    console.log(`Bot名: ${client.user.tag}`);
    console.log(`Bot ID: ${client.user.id}`);
    console.log(`参加しているサーバー数: ${client.guilds.cache.size}`);
    
    if (client.guilds.cache.size > 0) {
      console.log('\n参加しているサーバー:');
      client.guilds.cache.forEach(guild => {
        console.log(`  - ${guild.name} (ID: ${guild.id})`);
      });
    } else {
      console.log('\n⚠️  警告: Botが参加しているサーバーがありません');
      console.log('   Botをサーバーに招待してください');
    }
    
    client.destroy();
    process.exit(0);
  });

  client.on('error', (error) => {
    console.error('❌ Discord Botエラー:', error);
    process.exit(1);
  });

  try {
    console.log('Discord Botに接続中...\n');
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('❌ 接続に失敗しました:');
    console.error('エラータイプ:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    
    if (error.message.includes('Invalid token') || error.message.includes('401')) {
      console.error('\n💡 解決方法:');
      console.error('  1. Discord Developer Portalでトークンが正しいか確認');
      console.error('  2. トークンが無効になっていないか確認');
      console.error('  3. 必要に応じてトークンを再生成');
    }
    
    process.exit(1);
  }
}

checkConnection();

