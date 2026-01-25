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
        if (sortVal === 'date-asc') return a.start_date.localeCompare(b.start_date);
        if (sortVal === 'date-desc') return b.start_date.localeCompare(a.start_date);
        if (sortVal === 'title-asc') return a.title.localeCompare(b.title, 'ja');
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
                    <div class="md:col-span-4 font-bold text-base text-stone-800 text-left">${ex.title}</div>
                    <div class="md:col-span-3 text-stone-600 flex items-center text-left pl-1 -ml-2">
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
                            <h4 class="font-bold text-stone-500 text-xs mb-1">参照・リンク</h4>
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