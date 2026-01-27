let allExhibitions = [];
let currentFilteredResults = []; // 現在の検索条件に一致した全データを保存しておく用
let currentPage = 1;             // 今何ページ目か
const itemsPerPage = 50;         // 1ページあたりの件数

// 1. データの読み込み
const csvFile = 'mucha-database.csv'; // ファイル名
window.addEventListener('DOMContentLoaded', () => {
    Papa.parse(csvFile, {
        download: true,       // サーバーからファイルをダウンロードする設定
        header: true,         // 1行目をヘッダーとして扱う
        skipEmptyLines: true, // 空行を無視する
        complete: function(results) {
            // 読み込み成功時の処理
            allExhibitions = results.data;
            document.getElementById('total-count').textContent = `登録件数: ${allExhibitions.length} 件`;
            
            // フィルタ（都道府県・年）の選択肢を生成
            initPrefectureFilter(allExhibitions);
            initYearFilter(allExhibitions);

            // 読み込んだ全データを使ってグラフを描く
            renderChart(allExhibitions);
            renderRegionChart(allExhibitions);
        },
        error: function(err) {
            // エラー時の処理
            console.error("CSV読み込みエラー:", err);
            document.getElementById('total-count').textContent = "データ読み込み失敗";
        }
    });
});

// 都道府県プルダウンの生成（地方別・標準順）
function initPrefectureFilter(data) {
    const prefSelect = document.getElementById('search-pref');
    
    // 1. データ内に存在する都道府県を特定
    const existingPrefs = new Set(data.map(d => d.prefecture).filter(p => p));

    // 2. 日本の地方と都道府県の標準的な定義
    const regionDefinition = [
        { name: "北海道地方", prefs: ["北海道"] },
        { name: "東北地方", prefs: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
        { name: "関東地方", prefs: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
        { name: "中部地方", prefs: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"] },
        { name: "近畿地方", prefs: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
        { name: "中国地方", prefs: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"] },
        { name: "四国地方", prefs: ["徳島県", "香川県", "愛媛県", "高知県"] },
        { name: "九州・沖縄地方", prefs: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] }
    ];

    // 3. ドロップダウンの中身を生成
    regionDefinition.forEach(region => {
        // その地方に属する都道府県のうち、データに存在するものを抽出
        const matchPrefs = region.prefs.filter(p => existingPrefs.has(p));

        // その地方に該当するデータが1つでもある場合のみ、グループを作成
        if (matchPrefs.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = region.name;

            matchPrefs.forEach(pref => {
                const option = document.createElement('option');
                option.value = pref;
                option.textContent = pref;
                optgroup.appendChild(option);
            });

            prefSelect.appendChild(optgroup);
        }
    });
}

// 年の選択肢を自動生成する関数
function initYearFilter(data) {
    // データ内の「最小年」と「最大年」を見つける
    const years = data.map(d => parseInt(d.year)).filter(y => !isNaN(y));
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    const startSelect = document.getElementById('year-start');
    const endSelect = document.getElementById('year-end');

    // 最小年から最大年までループしてoptionタグを作る
    for (let y = minYear; y <= maxYear; y++) {
        // 開始年用
        const opt1 = document.createElement('option');
        opt1.value = y;
        opt1.textContent = y + "年";
        startSelect.appendChild(opt1);

        // 終了年用
        const opt2 = document.createElement('option');
        opt2.value = y;
        opt2.textContent = y + "年";
        endSelect.appendChild(opt2);
    }
}

// 2. 画面切り替え機能
function showView(viewName) {
    const homeView = document.getElementById('home-view');
    const resultView = document.getElementById('result-view');
    const aboutView = document.getElementById('about-view');
    
    // 1. まず、すべての画面を一旦「非表示」にする
    homeView.classList.add('hidden');
    resultView.classList.add('hidden');
    aboutView.classList.add('hidden');

    // 2. viewName（引数）に合わせて、指定された画面だけを「表示」にする
    if (viewName === 'result') {
        resultView.classList.remove('hidden');
    } else if (viewName === 'about') {
        aboutView.classList.remove('hidden');
        // データの読み込みが終わっている（allExhibitionsがある）か確認
        if (typeof allExhibitions !== 'undefined' && allExhibitions.length > 0) {
            // 画面の切り替え（hidden解除）が完了してから描画するために少しだけ待つ
            setTimeout(() => {
                renderChart(allExhibitions);
                renderRegionChart(allExhibitions);
            }, 100); 
        }
    } else {
        // それ以外（home）はホームを表示
        homeView.classList.remove('hidden');
    }

    // どの画面に切り替わっても、一番上までスクロールさせる
    window.scrollTo(0, 0);
}

// 戻るボタン
document.getElementById('btn-back').addEventListener('click', () => showView('home'));

// 3. 検索ロジック
document.getElementById('btn-search').addEventListener('click', () => {
    const keyword = document.getElementById('search-keyword').value.trim().toLowerCase();
    const mode = document.querySelector('input[name="search-mode"]:checked').value;
    const pref = document.getElementById('search-pref').value;
    const yearStart = parseInt(document.getElementById('year-start').value) || 0;
    const yearEnd = parseInt(document.getElementById('year-end').value) || 9999;

    const filtered = allExhibitions.filter(ex => {
        // 年フィルタ
        const year = parseInt(ex.year);
        if (year < yearStart || year > yearEnd) return false;
        
        // 都道府県フィルタ
        if (pref && ex.prefecture !== pref) return false;
        
        // キーワードフィルタ
        if (keyword) {
            // 検索対象にする項目を連結
            const targetText = [
                ex.title, 
                ex.venue, 
                ex.organizers, 
                ex.catalog_detail,
                ex.remarks, 
            ].join(' ').toLowerCase();

            const words = keyword.split(/\s+/); // 空白で区切って単語リスト化
            
            if (mode === 'and') {
                return words.every(w => targetText.includes(w));
            } else {
                return words.some(w => targetText.includes(w));
            }
        }
        return true;
    });

    currentFilteredResults = filtered; // 検索結果を保存
    currentPage = 1;                   // ページを1ページ目に戻す
    renderResults();                   // ( ) の中身は空にします
    showView('result');
});

// ソート順変更イベント
document.getElementById('sort-order').addEventListener('change', () => {
    // 現在の結果を再描画したいが、簡易的に検索ボタンをトリガーするか、
    // あるいは現在表示中のデータを保持しておく必要があります。
    // ここではシンプルに「検索ボタン」をプログラムから押して再検索させます。
    document.getElementById('btn-search').click(); 
});

// 4. 結果の描画
function renderResults() {
    const container = document.getElementById('result-list');
    container.innerHTML = '';
    
    const results = currentFilteredResults;
    const totalCount = results.length; // 全体の件数
    const infoSpan = document.getElementById('result-info');
    
    if (totalCount === 0) {
        infoSpan.classList.add('hidden'); // 0件なら表示を隠す
    } else {
        infoSpan.classList.remove('hidden');
        
        // ページネーションの計算
        const startIndex = (currentPage - 1) * itemsPerPage;
        const fromNum = startIndex + 1; // 開始番号 (1, 51, 101...)
        const toNum = Math.min(startIndex + itemsPerPage, totalCount); // 終了番号 (50, 100, または全件数)

        document.getElementById('result-total-count').textContent = totalCount;
        document.getElementById('result-range').textContent = `${fromNum}～${toNum}`;
    }

    // 1. ソート処理
    const sortVal = document.getElementById('sort-order').value;
    results.sort((a, b) => {
        // 日付が空の場合の予備（IDなどで比較）
        const dateA = a.start_date || "9999-12-31";
        const dateB = b.start_date || "9999-12-31";

        if (sortVal === 'date-desc') {
             // 新しい順（降順）
            return dateB.localeCompare(dateA);
        } else if (sortVal === 'title-asc') {
            // タイトル順
            return a.title.localeCompare(b.title, 'ja');
        } else {
            // デフォルト（古い順 / date-asc）
            // これにより、年が同じでも月日で正しく比較されます
            return dateA.localeCompare(dateB);
        } 
    });

    // 2. ページネーションの計算（50件切り出し）
    const totalPages = Math.ceil(results.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = results.slice(startIndex, endIndex);

    if (results.length === 0) {
        container.innerHTML = '<div class="text-center text-stone-500 py-8">該当する展覧会は見つかりませんでした。</div>';
        document.getElementById('pagination-controls').classList.add('hidden');
        return;
    }

    // 3. データの描画
    pageData.forEach(ex => {
        const row = document.createElement('div');
        row.className = 'item-row bg-white border border-stone-200 rounded-lg overflow-hidden transition cursor-pointer mb-3';
        
        // 簡易表示(summary-pnl) と 詳細表示(detail-content) の両方をセット
        row.innerHTML = `
            <div class="summary-pnl p-4 md:p-5 flex justify-between items-center bg-white hover:bg-stone-50 transition">
                <div class="flex-1 grid md:grid-cols-12 gap-2 text-sm items-center">
                    <div class="md:col-span-1 font-bold text-stone-400 text-left">${ex.year}</div>
                    <div class="md:col-span-4 font-bold text-base text-stone-800 text-left md:-ml-4">${ex.title}</div>
                    <div class="md:col-span-3 text-stone-600 flex items-center text-left md:pl-6 pl-1 -ml-2">
                        <span class="md:hidden text-xs font-bold text-stone-400 bg-stone-100 px-1 rounded mr-2">会場:</span>
                        ${ex.venue}
                    </div>
                    <div class="md:col-span-2 text-xs text-stone-500 flex items-center text-left pl-1 -ml-2">
                        <span class="md:hidden font-bold text-stone-400 bg-stone-100 px-1 rounded mr-2">会期:</span>
                        ${ex.date_range}
                    </div>
                    <div class="md:col-span-2 text-xs text-stone-500 flex items-center text-left pl-1 -ml-2">
                        <span class="md:hidden font-bold text-stone-400 bg-stone-100 px-1 rounded mr-2">巡回:</span>
                        <span class="bg-stone-100 px-2 py-1 rounded w-fit">${ex.tour_simple || '巡回なし'}</span>
                    </div>
                </div>
                <div class="arrow text-stone-400 ml-4">▼</div>
            </div>

            <div class="detail-content bg-stone-50 border-t border-stone-100 text-sm">
                <div class="p-6 md:p-8 grid md:grid-cols-2 gap-8">
                    <div class="space-y-4">
                        <div>
                            <h4 class="font-bold text-stone-500 text-xs mb-1">巡回情報（詳細）</h4>
                            <p class="leading-relaxed">${ex.tour_detailed || '-'}</p>
                        </div>
                        <div>
                            <h4 class="font-bold text-stone-500 text-xs mb-1">主催・後援・協賛</h4>
                            <p class="pre-wrap text-stone-700">${ex.organizers || '-'}</p>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <h4 class="font-bold text-stone-500 text-xs mb-1">カタログ情報</h4>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-xs font-bold px-2 py-0.5 bg-stone-200 rounded text-stone-700">有無: ${ex.catalog_status}</span>
                            </div>
                            <p class="pre-wrap text-stone-600">${ex.catalog_detail || '-'}</p>
                        </div>
                        <div>
                            <h4 class="font-bold text-stone-500 text-xs mb-1">備考</h4>
                            <p class="text-stone-700">${ex.remarks || '特になし'}</p>
                        </div>
                        ${ex.reference ? `
                        <div class="pt-2 border-t border-stone-200 mt-4">
                            <h4 class="font-bold text-stone-500 text-xs mb-1">参照</h4>
                            <p class="text-xs text-stone-500 break-all">${ex.reference}</p>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        `;

        // クリックで開閉するイベントリスナーを登録
        row.querySelector('.summary-pnl').addEventListener('click', () => {
            row.classList.toggle('open');
        });

        container.appendChild(row);
    });

    // 4. ページ操作UIの更新
    updatePaginationUI(totalPages);
}

// ページ操作UIを更新する関数
function updatePaginationUI(totalPages) {
    const controls = document.getElementById('pagination-controls');
    if (totalPages <= 1) {
        controls.classList.add('hidden'); // 1ページしかなければ隠す
        return;
    }
    
    controls.classList.remove('hidden'); // 2ページ以上あれば出す
    document.getElementById('current-page-num').textContent = currentPage;
    document.getElementById('total-pages-num').textContent = totalPages;

    document.getElementById('btn-prev').disabled = (currentPage === 1);
    document.getElementById('btn-next').disabled = (currentPage === totalPages);
}

// 「前へ」ボタンを押したとき
document.getElementById('btn-prev').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderResults();
        window.scrollTo(0, 0); // 上に戻る
    }
});

// 「次へ」ボタンを押したとき
document.getElementById('btn-next').addEventListener('click', () => {
    const totalPages = Math.ceil(currentFilteredResults.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderResults();
        window.scrollTo(0, 0); // 上に戻る
    }
});

// 詳細ページへ
document.getElementById('btn-about').addEventListener('click', () => showView('about'));
// 詳細ページから戻る
document.getElementById('btn-about-back').addEventListener('click', () => showView('home'));

// Aboutページの参照先アコーディオンの制御
document.getElementById('btn-toggle-refs').addEventListener('click', () => {
    const content = document.getElementById('about-refs-content');
    const icon = document.getElementById('ref-icon');
    
    const isHidden = content.classList.contains('hidden');
    
    if (isHidden) {
        content.classList.remove('hidden');
        icon.textContent = '－';
    } else {
        content.classList.add('hidden');
        icon.textContent = '＋';
    }
});

//開催頻度のグラフ
function renderChart(allData) {
    const canvas = document.getElementById('muchaChart');
    if (!canvas) return;

    // 以前のグラフが残っていたら破棄（再描画エラー防止）
    const existingChart = Chart.getChart("muchaChart");
    if (existingChart) { existingChart.destroy(); }

    const ctx = canvas.getContext('2d');
    
    // 1. 集計ピリオドの設定（1975年〜2024年までは5年刻み、最後は2025年単独）
    const periods = [
        { label: '1975-79', start: 1975, end: 1979, divisor: 5 },
        { label: '1980-84', start: 1980, end: 1984, divisor: 5 },
        { label: '1985-89', start: 1985, end: 1989, divisor: 5 },
        { label: '1990-94', start: 1990, end: 1994, divisor: 5 },
        { label: '1995-99', start: 1995, end: 1999, divisor: 5 },
        { label: '2000-04', start: 2000, end: 2004, divisor: 5 },
        { label: '2005-09', start: 2005, end: 2009, divisor: 5 },
        { label: '2010-14', start: 2010, end: 2014, divisor: 5 },
        { label: '2015-19', start: 2015, end: 2019, divisor: 5 },
        { label: '2020-24', start: 2020, end: 2024, divisor: 5 },
        { label: '2025-',   start: 2025, end: 2025, divisor: 1 } // 2025年以降は1で割る（＝そのままの数）
    ];

    const counts = periods.map(p => {
        return allData.filter(d => {
            const year = new Date(d.start_date).getFullYear();
            return year >= p.start && year <= p.end;
        }).length;
    });

    // 各期間の「年平均」を計算
    const averages = counts.map((count, index) => {
        const divisor = periods[index].divisor;
        return (count / divisor).toFixed(1);
    });

    // 2. グラフの描画
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: periods.map(p => p.label),
            datasets: [
                {
                    label: '年平均開催数',
                    data: averages,
                    type: 'line',
                    borderColor: '#78716c', // stone-500
                    backgroundColor: 'rgba(227, 150, 198, 0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    tension: 0.3, // 少し曲線を滑らかに
                    order: 1 // 折れ線を前に
                },
                {
                    label: '5年間の合計開催数',
                    data: counts,
                    backgroundColor: '#F7E1E1', 
                    hoverBackgroundColor: '#D18E8E',
                    borderRadius: 4,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { // 目盛りを左側に一本化
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '展覧会数（回）',
                        font: { size: 12, weight: 'bold' }
                    },
                    ticks: { stepSize: 5 } // 5刻みで見やすく
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: { boxWidth: 15, font: { size: 12 } }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#444',
                    bodyColor: '#444',
                    borderColor: '#ddd',
                    borderWidth: 1
                }
            }
        }
    });
}

/**
 * 地域別ドーナツグラフを描画する
 */
function renderRegionChart(allData) {
    const canvas = document.getElementById('regionChart');
    if (!canvas) return;

    // 以前のグラフが残っていたら破棄（再描画エラー防止）
    const existingChart = Chart.getChart("regionChart");
    if (existingChart) { existingChart.destroy(); }

    const ctx = canvas.getContext('2d');

    // 1. 都道府県 -> 地方のマッピング
    const regionMapping = {
        '北海道': ['北海道'],
        '東北': ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
        '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
        '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
        '近畿': ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
        '中国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
        '四国': ['徳島県', '香川県', '愛媛県', '高知県'],
        '九州': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
    };

    // 2. 集計
    const regionCounts = { '北海道': 0, '東北': 0, '関東': 0, '中部': 0, '近畿': 0, '中国': 0, '四国': 0, '九州': 0 };

    allData.forEach(d => {
        // ※CSVの列名が「prefecture」であることを想定しています。違う場合はここを書き換えてください。
        const pref = d.prefecture; 
        for (const [region, prefs] of Object.entries(regionMapping)) {
            if (prefs.includes(pref)) {
                regionCounts[region]++;
                break;
            }
        }
    });

    // 3. グラフ描画
    const salmonPalette = [
                '#D9A6A6', //
                '#D18E8E', // 
                '#DB968F', // 
                '#F2AE99', // 
                '#EBB4A2', // 
                '#F5CBA7', // 
                '#F5C6B4', // 
                '#F4C1C1'  // 
            ];
            
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(regionCounts),

            // datasets の設定
            datasets: [{
                data: Object.values(regionCounts),
                backgroundColor: salmonPalette,
                hoverBackgroundColor: salmonPalette, // 色は変えず、動きだけ出す
                hoverOffset: 15,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // 真ん中の穴の大きさ
            // 【ここを追加】グラフの周囲に余白を作る
            layout: {
                top: 10,
                bottom: 30, // 下に余白を作ってぶつかりを防止
                left: 10,
                right: 10
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, padding: 15, font: { size: 12 } }
                }
                
            }
        },
        // 真ん中に「44都道府県で開催」と表示するプラグイン
        plugins: [{
            id: 'centerText',
            afterDraw(chart) {
                const { width, height, ctx } = chart;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const centerX = chart.getDatasetMeta(0).data[0]?.x || width / 2;
                const centerY = chart.getDatasetMeta(0).data[0]?.y || height / 2;

                // 1行目
                ctx.font = "bold 25px sans-serif";
                ctx.fillStyle = "#615c57";
                ctx.fillText("44都道府県", centerX, centerY - 10);
                // 2行目
                ctx.font = "bold 18px sans-serif";
                ctx.fillStyle = "#a8a29e";
                ctx.fillText("で開催", centerX, centerY + 24);
                ctx.restore();
            }
        }]
    });
}

/**
 * 参照資料アコーディオンの開閉
 */
function toggleAccordion(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById('ref-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        if (icon) icon.textContent = '－';
    } else {
        content.classList.add('hidden');
        if (icon) icon.textContent = '＋';
    }
}

// 画面回転・リサイズ時にグラフを再描画
let resizeTimeout;
window.addEventListener('resize', () => {
    console.log('📐 resize イベント発火:', window.innerWidth, 'x', window.innerHeight);
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        console.log('⏱️ 再描画チェック開始');
        if (allExhibitions.length > 0) {
            const homeView = document.getElementById('home-view');
            // ホーム画面が表示されている場合のみ再描画
            if (!homeView.classList.contains('hidden')) {
                // canvasのサイズ属性をリセット
                const muchaCanvas = document.getElementById('muchaChart');
                const regionCanvas = document.getElementById('regionChart');
                if (muchaCanvas) {
                    muchaCanvas.style.width = '';
                    muchaCanvas.style.height = '';
                    muchaCanvas.removeAttribute('width');
                    muchaCanvas.removeAttribute('height');
                }
                if (regionCanvas) {
                    regionCanvas.style.width = '';
                    regionCanvas.style.height = '';
                    regionCanvas.removeAttribute('width');
                    regionCanvas.removeAttribute('height');
                }

                console.log('✅ canvasリセット後、グラフ再描画実行');
                console.log('親div幅:', muchaCanvas?.parentElement?.offsetWidth);
                renderChart(allExhibitions);
                renderRegionChart(allExhibitions);
            } else {
                console.log('⏭️ ホーム画面非表示 → スキップ');
            }
        } else {
            console.log('⚠️ データ未読み込み → スキップ');
        }
    }, 300);
});