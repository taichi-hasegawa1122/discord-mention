// APIのベースURL
// 本番環境では、Node.jsサーバーのURLを設定してください
// 例: const API_BASE = 'https://your-nodejs-server.com';
// 開発環境では空文字列のままにしてください
const API_BASE = '';

// DOM要素
const statusIndicator = document.getElementById('status');
const statusText = document.getElementById('status-text');
const statusDot = statusIndicator.querySelector('.status-dot');
const serverList = document.getElementById('server-list');
const serverSelect = document.getElementById('server-select');
const fetchBtn = document.getElementById('fetch-btn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const errorDiv = document.getElementById('error');
const serverNameEl = document.getElementById('server-name');
const statsEl = document.getElementById('stats');
const rankingsBody = document.getElementById('rankings-body');

// 接続状態を確認
async function checkStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        
        if (!response.ok) {
            throw new Error(`サーバーエラー: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();

        if (data.connected) {
            statusDot.classList.add('connected');
            statusText.textContent = 'Discord Botに接続済み';
            
        // サーバーリストを表示
        if (data.guilds.length > 0) {
            serverList.style.display = 'block';
            document.getElementById('date-range-section').style.display = 'block';
            serverSelect.innerHTML = '<option value="">サーバーを選択してください</option>';
            data.guilds.forEach(guild => {
                const option = document.createElement('option');
                option.value = guild.id;
                option.textContent = guild.name;
                serverSelect.appendChild(option);
            });
            
            // サーバーが1つだけの場合は自動選択
            if (data.guilds.length === 1) {
                serverSelect.value = data.guilds[0].id;
            }
            
            fetchBtn.disabled = !serverSelect.value;
        } else {
            statusText.textContent = '接続済み（参加しているサーバーが見つかりません）';
        }
        } else {
            statusDot.classList.remove('connected');
            statusText.textContent = 'Discord Botが接続されていません（トークンを確認してください）';
            serverList.style.display = 'none';
            fetchBtn.disabled = true;
        }
    } catch (error) {
        console.error('ステータス確認エラー:', error);
        statusDot.classList.remove('connected');
        
        if (error.message === 'Failed to fetch') {
            statusText.textContent = 'サーバーに接続できません（サーバーが起動しているか確認してください）';
        } else {
            statusText.textContent = '接続エラー: ' + error.message;
        }
        
        serverList.style.display = 'none';
        fetchBtn.disabled = true;
    }
}

let progressInterval = null;
let currentProgressId = null;

// ランキングを取得
async function fetchRankings() {
    const guildId = serverSelect.value;
    if (!guildId) {
        showError('サーバーを選択してください');
        return;
    }

    // 期間を取得
    const startDate = document.getElementById('start-date').value || null;
    const endDate = document.getElementById('end-date').value || null;
    
    // 期間の妥当性チェック
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        showError('開始日は終了日より前である必要があります');
        return;
    }

    // UI更新
    fetchBtn.disabled = true;
    loading.style.display = 'flex';
    results.style.display = 'none';
    errorDiv.style.display = 'none';
    rankingsBody.innerHTML = '';
    
    // 進捗セクションを表示
    const progressSection = document.getElementById('progress-section');
    progressSection.style.display = 'block';
    document.getElementById('progress-logs').innerHTML = '<div class="log-entry">処理を開始しました...</div>';

    try {
        // クエリパラメータを構築
        let url = `${API_BASE}/api/rankings/${guildId}?limit=10000`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ランキングの取得に失敗しました');
        }

        const data = await response.json();
        currentProgressId = data.progressId;
        
        // 進捗をポーリング
        startProgressPolling(currentProgressId, guildId);
    } catch (error) {
        console.error('ランキング取得エラー:', error);
        showError('エラー: ' + error.message);
        progressSection.style.display = 'none';
        fetchBtn.disabled = false;
        loading.style.display = 'none';
    }
}

// 進捗をポーリング
function startProgressPolling(progressId, guildId) {
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE}/api/progress/${progressId}`);
            if (!response.ok) {
                throw new Error('進捗情報の取得に失敗しました');
            }
            
            const progress = await response.json();
            updateProgress(progress);
            
            if (progress.status === 'completed') {
                clearInterval(progressInterval);
                // 結果を取得
                await fetchResult(progressId);
            } else if (progress.status === 'error') {
                clearInterval(progressInterval);
                showError('エラー: ' + (progress.error || '処理中にエラーが発生しました'));
                document.getElementById('progress-section').style.display = 'none';
                fetchBtn.disabled = false;
                loading.style.display = 'none';
            }
        } catch (error) {
            console.error('進捗取得エラー:', error);
        }
    }, 500); // 0.5秒ごとに更新
}

// 進捗を更新
function updateProgress(progress) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressStatus = document.getElementById('progress-status');
    const progressDetails = document.getElementById('progress-details');
    const progressLogs = document.getElementById('progress-logs');
    
    // 進捗率を計算
    let progressPercent = 0;
    if (progress.totalChannels > 0) {
        const channelProgress = (progress.processedChannels / progress.totalChannels) * 0.7; // 70%まで
        const userProgress = progress.totalUsers > 0 
            ? (progress.processedUsers / progress.totalUsers) * 0.3 // 残り30%
            : 0;
        progressPercent = Math.min(100, (channelProgress + userProgress) * 100);
    }
    
    progressFill.style.width = progressPercent + '%';
    progressText.textContent = Math.round(progressPercent) + '%';
    
    // ステータスを更新
    if (progress.status === 'processing') {
        if (progress.currentChannel) {
            progressStatus.textContent = `処理中: ${progress.currentChannel}`;
        } else {
            progressStatus.textContent = '処理中...';
        }
        
        let details = [];
        if (progress.totalChannels > 0) {
            details.push(`チャンネル: ${progress.processedChannels}/${progress.totalChannels}`);
        }
        if (progress.totalMessages > 0) {
            details.push(`メッセージ: ${progress.totalMessages.toLocaleString()}件`);
        }
        if (progress.totalMentions > 0) {
            details.push(`メンション: ${progress.totalMentions.toLocaleString()}件`);
        }
        if (progress.totalUsers > 0) {
            details.push(`ユーザー: ${progress.processedUsers}/${progress.totalUsers}`);
        }
        progressDetails.textContent = details.join(' | ');
    } else if (progress.status === 'completed') {
        progressStatus.textContent = '✅ 処理完了';
        progressFill.style.width = '100%';
        progressText.textContent = '100%';
    }
    
    // ログを更新
    if (progress.logs && progress.logs.length > 0) {
        progressLogs.innerHTML = progress.logs.map(log => 
            `<div class="log-entry">[${log.time}] ${escapeHtml(log.message)}</div>`
        ).join('');
        // 最新のログまでスクロール
        progressLogs.scrollTop = progressLogs.scrollHeight;
    }
}

// 結果を取得
async function fetchResult(progressId) {
    try {
        const response = await fetch(`${API_BASE}/api/result/${progressId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '結果の取得に失敗しました');
        }

        const data = await response.json();
        displayRankings(data);
        
        // 進捗セクションを非表示
        document.getElementById('progress-section').style.display = 'none';
        fetchBtn.disabled = false;
        loading.style.display = 'none';
    } catch (error) {
        console.error('結果取得エラー:', error);
        showError('エラー: ' + error.message);
        document.getElementById('progress-section').style.display = 'none';
        fetchBtn.disabled = false;
        loading.style.display = 'none';
    }
}

// ランキングを表示
function displayRankings(data) {
    serverNameEl.textContent = data.serverName || 'サーバー';
    statsEl.textContent = `総メッセージ数: ${data.totalMessages.toLocaleString()}件 | ランキング対象: ${data.rankings.length}人`;

    if (data.rankings.length === 0) {
        rankingsBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 40px; color: #999;">メンションが見つかりませんでした</td></tr>';
        results.style.display = 'block';
        return;
    }

    data.rankings.forEach((user, index) => {
        const row = document.createElement('tr');
        const rank = index + 1;

        let rankCell = '';
        if (rank <= 3) {
            rankCell = `<span class="rank-badge rank-${rank}">${rank}</span>`;
        } else {
            rankCell = `<span style="font-weight: 700; color: #53c0b7;">${rank}</span>`;
        }

        row.innerHTML = `
            <td>${rankCell}</td>
            <td>
                <div class="user-info">
                    <img src="${user.avatar}" alt="${user.username}" class="avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                    <div class="user-details">
                        <div class="username">${escapeHtml(user.displayName || user.username)}</div>
                        ${user.displayName ? `<div class="display-name">@${escapeHtml(user.username)}</div>` : ''}
                    </div>
                </div>
            </td>
            <td>${user.mentionCount.toLocaleString()}回</td>
        `;

        rankingsBody.appendChild(row);
    });

    results.style.display = 'block';
}

// エラーを表示
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// イベントリスナー
fetchBtn.addEventListener('click', fetchRankings);
serverSelect.addEventListener('change', () => {
    fetchBtn.disabled = !serverSelect.value;
});

// 期間クリアボタン
document.getElementById('clear-dates-btn').addEventListener('click', () => {
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
});

// 初期化
checkStatus();
// 30秒ごとにステータスを確認
setInterval(checkStatus, 30000);

