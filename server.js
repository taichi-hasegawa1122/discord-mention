const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定（本番環境では適切なオリジンを指定してください）
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : '*', // 開発環境ではすべてのオリジンを許可
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// 静的ファイルの配信
// Vercel環境でも静的ファイルを配信する必要がある
app.use(express.static(path.join(__dirname, 'public')));

// Discordクライアントの初期化
let discordClient = null;

// 進捗情報を保存
// Vercel環境では、グローバル変数として保存することで、複数のリクエスト間で共有できる可能性がある
// ただし、完全には保証されないため、外部ストレージの使用を推奨
const progressStore = global.progressStore || new Map();
global.progressStore = progressStore;

// 進捗情報ストアへのアクセスを統一するヘルパー関数
function getProgressStore() {
  return global.progressStore || progressStore;
}

// Discord Botの初期化
async function initializeDiscord() {
  if (!process.env.DISCORD_TOKEN) {
    console.error('DISCORD_TOKENが設定されていません。.envファイルを確認してください。');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Discord Botに接続しました');
    
    // 接続イベントのハンドラ
    client.on('ready', () => {
      console.log(`Botがログインしました: ${client.user.tag}`);
      console.log(`参加しているサーバー数: ${client.guilds.cache.size}`);
    });

    client.on('error', (error) => {
      console.error('Discord Botエラー:', error);
    });

    return client;
  } catch (error) {
    console.error('Discord Botの接続に失敗しました:');
    console.error('エラータイプ:', error.constructor.name);
    console.error('エラーメッセージ:', error.message);
    if (error.code) {
      console.error('エラーコード:', error.code);
    }
    console.error('詳細:', error);
    return null;
  }
}

// メンション数をカウントする関数
async function countMentions(guildId, limit = 10000, progressId = null, startDate = null, endDate = null) {
  if (!discordClient) {
    throw new Error('Discord Botが接続されていません');
  }

  const guild = discordClient.guilds.cache.get(guildId);
  if (!guild) {
    throw new Error('サーバーが見つかりません');
  }

  // 進捗情報の初期化
  if (progressId) {
    // グローバルストアを使用（Vercel環境対応）
    const store = getProgressStore();
    global.progressStore = store;
    
    store.set(progressId, {
      status: 'processing',
      serverName: guild.name,
      totalChannels: 0,
      processedChannels: 0,
      currentChannel: '',
      totalMessages: 0,
      totalMentions: 0,
      processedUsers: 0,
      totalUsers: 0,
      logs: [],
    });
  }

  const addLog = (message) => {
    if (progressId) {
      const progress = getProgressStore().get(progressId);
      if (progress) {
        progress.logs.push({
          time: new Date().toLocaleTimeString('ja-JP'),
          message: message,
        });
        // ログは最新100件まで保持
        if (progress.logs.length > 100) {
          progress.logs.shift();
        }
      }
    }
    console.log(message);
  };

  addLog('\n=== メンション数ランキング取得開始 ===');
  addLog(`サーバー: ${guild.name} (ID: ${guildId})`);
  addLog(`取得上限: ${limit.toLocaleString()}件`);
  if (startDate || endDate) {
    const startStr = startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('ja-JP') : '制限なし';
    const endStr = endDate ? new Date(endDate + 'T23:59:59').toLocaleDateString('ja-JP') : '制限なし';
    addLog(`期間: ${startStr} ～ ${endStr}`);
  }
  addLog('');

  const mentionCounts = new Map(); // ユーザーID -> メンション数

  // すべてのチャンネルを取得
  const channels = guild.channels.cache.filter(
    channel => channel.isTextBased() && channel.viewable
  );

  if (progressId) {
    const progress = getProgressStore().get(progressId);
    if (progress) {
      progress.totalChannels = channels.size;
    }
  }

  addLog(`対象チャンネル数: ${channels.size}個`);
  addLog('');

  let totalMessages = 0;
  let processedChannels = 0;

  // 各チャンネルからメッセージを取得
  for (const [channelId, channel] of channels) {
    processedChannels++;
    try {
      if (progressId) {
        const progress = getProgressStore().get(progressId);
        if (progress) {
          progress.processedChannels = processedChannels;
          progress.currentChannel = channel.name;
        }
      }
      
      addLog(`[${processedChannels}/${channels.size}] チャンネル「${channel.name}」を処理中...`);
      
      let lastMessageId = null;
      let fetchedCount = 0;
      let channelMessages = 0;
      let channelMentions = 0;
      
      // 期間フィルタリング用の変数
      let earliestMessageDate = null;
      let shouldStop = false;

      // 期間の開始日時と終了日時を準備
      const startDateTime = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endDateTime = endDate ? new Date(endDate + 'T23:59:59.999') : null;

      while (fetchedCount < limit && !shouldStop) {
        const options = { limit: 100 };
        if (lastMessageId) {
          options.before = lastMessageId;
        }

        const messages = await channel.messages.fetch(options);
        
        if (messages.size === 0) break;

        // 各メッセージのメンションをカウント（期間フィルタリング）
        let periodMessagesInBatch = 0;
        let foundMessagesInPeriod = false;
        
        messages.forEach(message => {
          // 期間フィルタリング
          const messageDate = message.createdAt;
          
          // 開始日チェック
          if (startDateTime && messageDate < startDateTime) {
            // 開始日より前のメッセージに到達
            // メッセージは新しい順なので、これより古いメッセージも期間外
            shouldStop = true;
            return;
          }
          
          // 終了日チェック
          if (endDateTime && messageDate > endDateTime) {
            // 終了日より後のメッセージはスキップ（新しい順なので続行）
            return;
          }
          
          // 期間内のメッセージ
          foundMessagesInPeriod = true;
          periodMessagesInBatch++;
          channelMessages++;
          
          if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
              if (!user.bot) { // ボットは除外
                const count = mentionCounts.get(user.id) || 0;
                mentionCounts.set(user.id, count + 1);
                channelMentions++;
              }
            });
          }
          
          // 最古のメッセージ日時を記録
          if (!earliestMessageDate || messageDate < earliestMessageDate) {
            earliestMessageDate = messageDate;
          }
        });

        lastMessageId = messages.last().id;
        fetchedCount += messages.size;
        totalMessages += channelMessages;

        // 進捗を更新
        if (progressId) {
          const progress = getProgressStore().get(progressId);
          if (progress) {
            progress.totalMessages = totalMessages;
          }
        }
        
        // 進捗を表示（1000件ごと）
        if (fetchedCount % 1000 === 0 || fetchedCount === messages.size) {
          const periodInfo = startDate || endDate ? `（期間内: ${periodMessagesInBatch.toLocaleString()}件）` : '';
          process.stdout.write(`  取得済み: ${fetchedCount.toLocaleString()}件${periodInfo}\r`);
        }

        // 期間指定がある場合、開始日より前のメッセージに到達したら終了
        if (shouldStop) {
          break;
        }
        
        // 期間指定があり、このバッチに期間内のメッセージがなく、終了日より前のメッセージに到達した場合
        if (startDateTime && !foundMessagesInPeriod && earliestMessageDate && earliestMessageDate < startDateTime) {
          break;
        }

        if (messages.size < 100) break; // これ以上メッセージがない
      }
      
      const periodInfo = startDate || endDate ? '（期間内）' : '';
      addLog(`  ✅ 完了: ${channelMessages.toLocaleString()}件のメッセージ${periodInfo}、${channelMentions.toLocaleString()}件のメンションを検出`);
      
      if (progressId) {
        const progress = getProgressStore().get(progressId);
        if (progress) {
          progress.totalMentions += channelMentions;
        }
      }
    } catch (error) {
      addLog(`  ❌ エラー: チャンネル「${channel.name}」の取得中にエラー: ${error.message}`);
    }
  }
  
  addLog('');
  addLog(`全チャンネル処理完了: 合計 ${totalMessages.toLocaleString()}件のメッセージを取得`);

  // ユーザー情報とメンション数を結合
  if (progressId) {
    const progress = getProgressStore().get(progressId);
    if (progress) {
      progress.totalUsers = mentionCounts.size;
    }
  }
  
  addLog(`ユーザー情報を取得中... (${mentionCounts.size}人)`);
  const rankings = [];
  let processedUsers = 0;
  
  for (const [userId, count] of mentionCounts) {
    processedUsers++;
    try {
      const user = await guild.members.fetch(userId).catch(() => null);
      if (user) {
        rankings.push({
          userId: userId,
          username: user.user.username,
          displayName: user.displayName,
          avatar: user.user.displayAvatarURL({ size: 64 }),
          mentionCount: count,
        });
      }
      
      if (progressId) {
        const progress = getProgressStore().get(progressId);
        if (progress) {
          progress.processedUsers = processedUsers;
        }
      }
      
      // 進捗を表示（10人ごと）
      if (processedUsers % 10 === 0 || processedUsers === mentionCounts.size) {
        process.stdout.write(`  処理中: ${processedUsers}/${mentionCounts.size}人\r`);
      }
    } catch (error) {
      // ユーザーが取得できない場合はスキップ
    }
  }
  
  addLog('');
  addLog(`ユーザー情報取得完了: ${rankings.length}人`);

  // メンション数でソート
  rankings.sort((a, b) => b.mentionCount - a.mentionCount);

  addLog('');
  addLog('=== ランキング結果 ===');
  if (rankings.length > 0) {
    addLog('トップ10:');
    rankings.slice(0, 10).forEach((user, index) => {
      addLog(`  ${index + 1}. ${user.displayName || user.username}: ${user.mentionCount.toLocaleString()}回`);
    });
  } else {
    addLog('  メンションが見つかりませんでした');
  }
  addLog('====================\n');

  // 進捗情報を完了状態に更新
  if (progressId) {
    const progress = getProgressStore().get(progressId);
    if (progress) {
      progress.status = 'completed';
      progress.currentChannel = '';
    }
  }

  return {
    rankings,
    totalMessages,
    serverName: guild.name,
  };
}

// APIエンドポイント: メンションランキングを取得
app.get('/api/rankings/:guildId', async (req, res) => {
  const startTime = Date.now();
  const { guildId } = req.params;
  const limit = parseInt(req.query.limit) || 10000;
  const startDate = req.query.startDate || null;
  const endDate = req.query.endDate || null;
  const progressId = `progress_${guildId}_${Date.now()}`;
  
  console.log(`\n[${new Date().toLocaleString('ja-JP')}] ランキング取得リクエスト受信`);
  console.log(`  サーバーID: ${guildId}`);
  console.log(`  取得上限: ${limit.toLocaleString()}件`);
  if (startDate || endDate) {
    console.log(`  期間: ${startDate || '制限なし'} ～ ${endDate || '制限なし'}`);
  }
  console.log(`  進捗ID: ${progressId}`);

  try {
    if (!discordClient) {
      console.error('  ❌ Discord Botが接続されていません');
      return res.status(503).json({ error: 'Discord Botが接続されていません' });
    }

    // 非同期で処理を開始（結果は進捗情報に保存）
    countMentions(guildId, limit, progressId, startDate, endDate)
      .then(result => {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ ランキング取得完了 (処理時間: ${elapsedTime}秒)`);
        console.log(`  結果: ${result.rankings.length}人のランキング、${result.totalMessages.toLocaleString()}件のメッセージを処理\n`);
        
        // 結果を進捗情報に保存
        const progress = getProgressStore().get(progressId);
        if (progress) {
          progress.result = result;
        }
        
        // 進捗情報を削除（5分後に自動削除）
        setTimeout(() => {
          getProgressStore().delete(progressId);
        }, 5 * 60 * 1000);
      })
      .catch(error => {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.error(`❌ ランキング取得エラー (処理時間: ${elapsedTime}秒):`, error.message);
        
        if (progressId) {
          const progress = getProgressStore().get(progressId);
          if (progress) {
            progress.status = 'error';
            progress.error = error.message;
          }
        }
      });

    // 進捗IDを返す
    res.json({ progressId: progressId, message: '処理を開始しました' });
  } catch (error) {
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(`❌ ランキング取得エラー (処理時間: ${elapsedTime}秒):`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// APIエンドポイント: 進捗情報を取得
app.get('/api/progress/:progressId', (req, res) => {
  const { progressId } = req.params;
  
  // グローバルストアから取得を試みる
  const store = getProgressStore();
  const progress = store.get(progressId);
  
  if (!progress) {
    // デバッグ情報を追加
    console.log(`進捗情報が見つかりません: ${progressId}`);
    console.log(`現在のストアサイズ: ${store.size}`);
    console.log(`ストアのキー: ${Array.from(store.keys()).slice(0, 5).join(', ')}...`);
    
    return res.status(404).json({ 
      error: '進捗情報が見つかりません',
      progressId: progressId,
      storeSize: store.size,
      availableKeys: Array.from(store.keys()).slice(0, 10),
    });
  }
  
  res.json(progress);
});

// APIエンドポイント: ランキング結果を取得（進捗IDから）
app.get('/api/result/:progressId', (req, res) => {
  const { progressId } = req.params;
  const progress = getProgressStore().get(progressId);
  
  if (!progress) {
    return res.status(404).json({ error: '進捗情報が見つかりません' });
  }
  
  if (progress.status !== 'completed') {
    return res.status(400).json({ error: '処理がまだ完了していません' });
  }
  
  if (!progress.result) {
    return res.status(500).json({ error: '結果が見つかりません' });
  }
  
  res.json(progress.result);
});

// APIエンドポイント: 接続状態を確認
app.get('/api/status', async (req, res) => {
  // 環境変数の確認
  const hasToken = !!process.env.DISCORD_TOKEN;
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV);
  
  // デバッグ情報
  const debugInfo = {
    hasToken: hasToken,
    isVercel: isVercel,
    hasClient: discordClient !== null,
    isReady: discordClient ? discordClient.isReady() : false,
  };
  
  // Vercel環境で接続されていない場合、再接続を試みる
  if (isVercel && (!discordClient || !discordClient.isReady())) {
    if (!hasToken) {
      return res.json({
        connected: false,
        guilds: [],
        error: 'DISCORD_TOKEN環境変数が設定されていません。Vercel Dashboard → Settings → Environment Variables で設定してください。',
        debug: debugInfo,
      });
    }
    
    // 再接続を試みる
    if (!discordClient) {
      try {
        console.log('Discord Bot再接続を試みます...');
        discordClient = await initializeDiscord();
        if (discordClient) {
          console.log('Discord Bot再接続成功');
        } else {
          console.error('Discord Bot再接続失敗: initializeDiscordがnullを返しました');
        }
      } catch (error) {
        console.error('Discord Bot再接続エラー:', error);
      }
    }
  }
  
  const connected = discordClient !== null && discordClient.isReady();
  
  res.json({
    connected: connected,
    guilds: connected
      ? discordClient.guilds.cache.map(guild => ({
          id: guild.id,
          name: guild.name,
        }))
      : [],
    error: !connected
      ? (hasToken 
          ? 'Discord Botが接続されていません。Vercel DashboardのLogsを確認してください。'
          : 'DISCORD_TOKEN環境変数が設定されていません。Vercel Dashboard → Settings → Environment Variables で設定してください。')
      : undefined,
    debug: isVercel ? debugInfo : undefined, // デバッグ情報はVercel環境のみ
  });
});

// APIエンドポイント: サーバー情報を詳細に取得（テスト用）
app.get('/api/test/guild/:guildId', async (req, res) => {
  try {
    if (!discordClient || !discordClient.isReady()) {
      return res.status(503).json({ error: 'Discord Botが接続されていません' });
    }

    const { guildId } = req.params;
    const guild = discordClient.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'サーバーが見つかりません' });
    }

    // サーバー情報を取得
    const serverInfo = {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      ownerId: guild.ownerId,
      createdAt: guild.createdAt.toISOString(),
    };

    res.json({
      success: true,
      server: serverInfo,
      message: 'サーバー情報の取得に成功しました',
    });
  } catch (error) {
    console.error('サーバー情報取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// APIエンドポイント: チャンネル情報を取得（テスト用）
app.get('/api/test/channels/:guildId', async (req, res) => {
  try {
    if (!discordClient || !discordClient.isReady()) {
      return res.status(503).json({ error: 'Discord Botが接続されていません' });
    }

    const { guildId } = req.params;
    const guild = discordClient.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'サーバーが見つかりません' });
    }

    // すべてのチャンネルを取得
    const channels = guild.channels.cache
      .filter(channel => channel.isTextBased() && channel.viewable)
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        viewable: channel.viewable,
      }));

    res.json({
      success: true,
      channels: channels,
      channelCount: channels.length,
      message: 'チャンネル情報の取得に成功しました',
    });
  } catch (error) {
    console.error('チャンネル情報取得エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// APIエンドポイント: メッセージを読み取る（テスト用）
app.get('/api/test/messages/:channelId', async (req, res) => {
  try {
    if (!discordClient || !discordClient.isReady()) {
      return res.status(503).json({ error: 'Discord Botが接続されていません' });
    }

    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 5; // デフォルト5件

    const channel = discordClient.channels.cache.get(channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'チャンネルが見つかりません' });
    }

    if (!channel.isTextBased()) {
      return res.status(400).json({ error: 'テキストチャンネルではありません' });
    }

    // メッセージを取得
    const messages = await channel.messages.fetch({ limit: limit });
    
    const messageList = messages.map(msg => ({
      id: msg.id,
      content: msg.content.substring(0, 200), // 最初の200文字のみ
      author: {
        id: msg.author.id,
        username: msg.author.username,
        bot: msg.author.bot,
      },
      mentions: {
        users: msg.mentions.users.map(u => ({
          id: u.id,
          username: u.username,
        })),
        count: msg.mentions.users.size,
      },
      createdAt: msg.createdAt.toISOString(),
    }));

    res.json({
      success: true,
      channel: {
        id: channel.id,
        name: channel.name,
      },
      messages: messageList,
      messageCount: messageList.length,
      message: 'メッセージの読み取りに成功しました',
    });
  } catch (error) {
    console.error('メッセージ読み取りエラー:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'メッセージを読み取る権限がない可能性があります',
    });
  }
});

// APIエンドポイント: 総合テスト（サーバー、チャンネル、メッセージを一度にテスト）
app.get('/api/test/all/:guildId', async (req, res) => {
  try {
    if (!discordClient || !discordClient.isReady()) {
      return res.status(503).json({ error: 'Discord Botが接続されていません' });
    }

    const { guildId } = req.params;
    const guild = discordClient.guilds.cache.get(guildId);
    
    if (!guild) {
      return res.status(404).json({ error: 'サーバーが見つかりません' });
    }

    const results = {
      server: {
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
        success: true,
      },
      channels: [],
      messages: [],
    };

    // チャンネルを取得
    const channels = guild.channels.cache.filter(
      channel => channel.isTextBased() && channel.viewable
    );

    results.channels = Array.from(channels.values()).slice(0, 5).map(channel => ({
      id: channel.id,
      name: channel.name,
      type: channel.type,
    }));

    // 最初のチャンネルからメッセージを取得してみる
    if (results.channels.length > 0) {
      try {
        const firstChannel = channels.first();
        const messages = await firstChannel.messages.fetch({ limit: 3 });
        results.messages = messages.map(msg => ({
          id: msg.id,
          content: msg.content.substring(0, 100),
          author: msg.author.username,
          hasMentions: msg.mentions.users.size > 0,
        }));
        results.messageTestSuccess = true;
      } catch (error) {
        results.messageTestSuccess = false;
        results.messageTestError = error.message;
      }
    }

    res.json({
      success: true,
      results: results,
      message: 'すべてのテストが完了しました',
    });
  } catch (error) {
    console.error('総合テストエラー:', error);
    res.status(500).json({ error: error.message });
  }
});

// ルートパス（静的ファイルの配信の後に定義）
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    console.error('index.html送信エラー:', error);
    res.status(500).send('Internal Server Error');
  }
});

// サーバー起動
async function startServer() {
  discordClient = await initializeDiscord();
  
  // Vercelではapp.listen()は不要
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    console.log('Vercel環境で起動しました');
  } else {
    app.listen(PORT, () => {
      console.log(`サーバーが http://localhost:${PORT} で起動しました`);
      if (!discordClient) {
        console.warn('警告: Discord Botが接続されていません。.envファイルを確認してください。');
      }
    });
  }
}

// Vercel用にエクスポート
// Vercel環境の検出（VERCEL環境変数またはVERCEL_ENV）
if (process.env.VERCEL || process.env.VERCEL_ENV) {
  console.log('Vercel環境で起動しました');
  
  // 環境変数の確認
  if (!process.env.DISCORD_TOKEN) {
    console.error('⚠️ 警告: DISCORD_TOKEN環境変数が設定されていません');
    console.error('Vercel Dashboard → Settings → Environment Variables で設定してください');
  } else {
    console.log('✅ DISCORD_TOKEN環境変数が設定されています');
  }
  
  // Vercel環境では非同期で初期化（即座に開始）
  (async () => {
    try {
      const client = await initializeDiscord();
      discordClient = client;
      if (client) {
        console.log('✅ Vercel環境: Discord Bot接続完了');
      } else {
        console.error('❌ Vercel環境: Discord Bot接続失敗');
      }
    } catch (error) {
      console.error('❌ Vercel環境: Discord Bot接続エラー', error);
    }
  })();
  
  module.exports = app;
} else {
  // ローカル環境では通常通り起動
  startServer();
}

