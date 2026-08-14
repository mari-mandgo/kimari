import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'KIMARI | 話すだけで、現場が決まる。',
  description: '打ち合わせ音声から決定・保留・追加見積を整理し、リノベーションの全履歴をひとつにつなぐAIエージェント。',
};

const features = [
  {
    no: '01', kicker: 'RECORD', title: '打ち合わせを録る。',
    body: 'スマートフォンひとつで録音を開始。設計打ち合わせも現場打ち合わせも、話者を分けながら文字に起こし、プロジェクトへ保存します。',
    points: ['現場でそのまま録音', '話者を分けて文字起こし', '写真・資料と一緒に保存'],
    result: '聞き直せる、探せる、証拠が残る。',
  },
  {
    no: '02', kicker: 'UNDERSTAND', title: 'AIが判断を整理する。',
    body: '議事録を作るだけではありません。会話の文脈を読み、決定・保留・確認・担当・期限を、現場が動ける情報へ変換します。',
    points: ['決定／保留／確認を自動分類', '担当者と期限を抽出', '要点と原文をひも付け'],
    result: '会話が、そのまま次のアクションになる。',
  },
  {
    no: '03', kicker: 'ESTIMATE', title: '追加見積につなぐ。',
    body: '「移動したい」「変更したい」といった会話から、費用が発生する可能性を検知。工事項目・数量・理由のたたき台を作ります。',
    points: ['追加費用の可能性を検知', '見積項目のたたき台を生成', '担当者が確認して確定'],
    result: '請求漏れを防ぎ、見積提出を速くする。',
  },
];

const timeline = [
  ['01', '初回打ち合わせ', '要望を記録'],
  ['02', 'プラン提案', '選択肢を共有'],
  ['03', '見積もり提示', '変更点を確認'],
  ['04', '工事開始', '現場を記録'],
  ['05', 'お引き渡し', 'すべてを一枚に'],
];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/lp" aria-label="KIMARI トップ">
          <Image src="/logo-h-trim.png" alt="KIMARI" width={188} height={37} priority />
        </Link>
        <nav className={styles.nav} aria-label="ページ内ナビゲーション">
          <a href="#value">できること</a>
          <a href="#story">施主との共有</a>
          <a href="#technology">AI・安全性</a>
        </nav>
        <Link className={styles.headerCta} href="/demo">デモを体験する</Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>RENOVATION AI AGENT</p>
            <h1>話すだけで、<br /><span>現場が決まる。</span></h1>
            <p className={styles.lead}>打ち合わせから追加見積まで。<br />会話を、次の仕事に変えるリノベAIエージェント。</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryCta} href="/demo">KIMARIを体験する <span>→</span></Link>
              <a className={styles.textLink} href="#value">できることを見る ↓</a>
            </div>
            <div className={styles.trustLine}>
              <span>音声から自動整理</span><span>追加見積を検知</span><span>施主とリアルタイム共有</span>
            </div>
          </div>

          <div className={styles.heroDemo} aria-label="KIMARIの解析画面イメージ">
            <div className={styles.demoTop}><span className={styles.liveDot} /> 現場打ち合わせを解析中 <small>12:48</small></div>
            <div className={styles.transcript}>
              <p><b>施主</b> キッチンを、もう少し窓側に寄せられないかなと。</p>
              <p><b>担当</b> 600ミリ動かす場合、給排水の移設が必要になります。</p>
            </div>
            <div className={styles.aiCard}>
              <div className={styles.aiLabel}>KIMARI AI</div>
              <h2>追加見積が必要です</h2>
              <div className={styles.quoteRow}><span>見積項目</span><strong>キッチン給排水 移設工事</strong></div>
              <div className={styles.quoteMeta}><span>数量 <b>1式</b></span><span>優先度 <b>高</b></span><span>期限 <b>今週中</b></span></div>
              <button type="button">見積もり項目に追加 ✓</button>
            </div>
            <div className={styles.demoBadge}>会話から、見積の一歩手前まで。</div>
          </div>
        </div>
      </section>

      <section className={styles.motionStrip} aria-label="KIMARIでつながる情報">
        <div className={styles.motionTrack}>
          {[0, 1].map((copy) => (
            <div className={styles.motionGroup} key={copy} aria-hidden={copy === 1}>
              <article className={styles.motionPhoto}><Image src="/hero-default.jpg" alt="" width={800} height={267} /><span>現場打ち合わせ</span><b>録音と写真をひとつに</b></article>
              <article className={styles.motionCard}><small>DECISION</small><span className={styles.blue}>決定</span><b>建具カラーをオークへ変更</b><p>金額変更なし</p></article>
              <article className={styles.motionCard}><small>ESTIMATE</small><span className={styles.red}>追加見積</span><b>キッチン給排水 移設工事</b><p>数量 1式 · 今週中</p></article>
              <article className={styles.motionCard}><small>ACTION</small><span className={styles.green}>確認</span><b>壁下地の補強要否</b><p>構造担当へタスク化</p></article>
              <article className={styles.motionStory}><Image src="/kimari-story.png" alt="" width={1536} height={1024} /><span>施主共有ページ</span><b>家づくりのすべてを一枚に</b></article>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.problem}>
        <p>言った、言わない。見積もり忘れ。伝達のための電話。</p>
        <h2>現場のすれ違いは、<br />会話が「仕事」にならないことから始まる。</h2>
        <div className={styles.problemStats}>
          <div><strong>?</strong><span>誰が決めたか<br />わからない</span></div>
          <div><strong>¥</strong><span>追加工事を<br />請求しそびれる</span></div>
          <div><strong>↗</strong><span>施主への共有が<br />あと回しになる</span></div>
        </div>
      </section>

      {/* 動いているところを、読む前に見てもらう */}
      <section className={styles.videoSection}>
        <p className={styles.eyebrow}>DEMO</p>
        <h2>3分で、ひととおり動きます。</h2>
        <p>
          録音から、追加見積が必要な変更の抽出、工事項目の拾い出し、施主ページへの共有まで。
          実際の打ち合わせを録って通しています。
        </p>
        <div className={styles.videoFrame}>
          <iframe
            src="https://www.youtube.com/embed/6HwpSwbsNXw"
            title="KIMARI デモ動画"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section id="value" className={styles.valueSection}>
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>HOW IT WORKS</p>
          <h2>会話のあとに残るのは、<br />議事録ではなく「次の仕事」。</h2>
        </div>
        <div className={styles.featureSteps}>
          {features.map((feature, index) => (
            <article key={feature.no} className={styles.featureStep}>
              <div className={styles.stepVisual}>
                <div className={styles.stepNumber}>{feature.no}</div>
                {index === 0 && <><div className={styles.wave}><i /><i /><i /><i /><i /><i /><i /></div><div className={styles.recordPill}><span className={styles.liveDot} /> 録音中 <b>12:48</b></div></>}
                {index === 1 && <div className={styles.decisionStack}><span><i className={styles.blue} />決定 <b>建具カラー変更</b></span><span><i className={styles.amber} />保留 <b>床材グレード</b></span><span><i className={styles.green} />確認 <b>壁下地の補強</b></span></div>}
                {index === 2 && <div className={styles.miniEstimate}><small>追加見積</small><h4>キッチン給排水 移設工事</h4><p>数量　1式</p><p>理由　キッチンを600mm移動</p><button type="button">見積項目に追加 ✓</button></div>}
              </div>
              <div className={styles.stepCopy}>
                <p className={styles.stepKicker}>STEP {feature.no} · {feature.kicker}</p>
                <h3>{feature.title}</h3><p>{feature.body}</p>
                <ul>{feature.points.map((point) => <li key={point}>{point}</li>)}</ul>
                <div className={styles.stepResult}><small>できること</small><b>{feature.result}</b></div>
              </div>
            </article>
          ))}
        </div>
        <div className={styles.classifyPanel}>
          <div>
            <p className={styles.panelKicker}>AI DECISION ENGINE</p>
            <h3>同じ会話の中から、<br />意味の違う“判断”を分ける。</h3>
            <p>変更のすべてが追加費用とは限りません。KIMARIは文脈を読み、現場が次に取るべき行動へ整理します。</p>
          </div>
          <div className={styles.classifyList}>
            <div><span className={styles.red}>追加見積</span><b>キッチン給排水の移設</b><small>見積項目を生成</small></div>
            <div><span className={styles.blue}>決定</span><b>建具カラーをオークへ変更</b><small>金額変更なし</small></div>
            <div><span className={styles.amber}>保留</span><b>床材のグレードアップ</b><small>施主の回答待ち</small></div>
            <div><span className={styles.green}>確認</span><b>壁下地の補強要否</b><small>構造担当へタスク化</small></div>
          </div>
        </div>
      </section>

      <section id="story" className={styles.storySection}>
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>ONE PROJECT, ONE STORY</p>
          <h2>施主が見たいのは、<br />自分の家ができていく物語。</h2>
          <p>初回打ち合わせからお引き渡しまで。設計も現場も、すべてを時系列で一枚のWebページに。</p>
        </div>
        <div className={styles.storyBrowser}>
          <div className={styles.browserBar}><i /><i /><i /><span>kimari.app/story/my-renovation</span></div>
          <Image src="/shots/owner-lp.png" alt="KIMARIの施主向けページ（実際の画面）" width={1440} height={940} />
        </div>
        <div className={styles.timeline}>
          {timeline.map(([no, title, sub]) => <div key={no}><b>{no}</b><span>{title}<small>{sub}</small></span></div>)}
        </div>
        <div className={styles.ownerSection}>
          <div className={styles.ownerIntro}>
            <p className={styles.eyebrow}>FOR HOMEOWNERS</p>
            <h3>施主にとっては、<br />“安心できる家づくり”になる。</h3>
            <p>専門用語が多く、決めることも多いリノベーション。KIMARIなら、今どうなっているか、何を決めたか、次に何をすればいいかを、いつでも自分の言葉で確認できます。</p>
          </div>
          <div className={styles.ownerBenefits}>
            <article><span>01</span><div><h4>進み具合が、いつでも見える</h4><p>打ち合わせ・図面・現場写真・見積もりを時系列で表示。完成までの現在地がひと目で分かります。</p></div></article>
            <article><span>02</span><div><h4>「なぜ増えた？」が、すぐ分かる</h4><p>追加見積を、そのきっかけになった会話と一緒に確認。変更理由と金額の納得感が生まれます。</p></div></article>
            <article><span>03</span><div><h4>気になった場所から、すぐ質問</h4><p>記録や写真にひも付けてメッセージ。電話のタイミングを気にせず、伝えたいことを正確に送れます。</p></div></article>
          </div>
        </div>
      </section>

      <section id="technology" className={styles.techSection}>
        <div className={styles.techCopy}>
          <p className={styles.eyebrow}>PRODUCTION-READY AI PRODUCT</p>
          <h2>本番で通用する、<br />次世代のAI Productへ。</h2>
          <p>精度が高いだけでは、現場には置けません。KIMARIは、個人情報・コスト・障害・誤判定までを前提に、毎日の業務で使い続けられるAIとして設計しています。</p>
          <div className={styles.themeBadge}><b>AI HACK 2026</b><span>「本番で通用する」を、実装で証明する。</span></div>
        </div>
        <div className={styles.techGrid}>
          <article><span>01 · INTELLIGENCE</span><h3>AIでなければできない判断</h3><p>長い会話の文脈から、変更・費用・担当・期限の関係を読み解き、次の業務へ構造化。</p><b>文脈理解 × 業務アクション</b></article>
          <article><span>02 · COST</span><h3>LLM原価をリクエスト単位で管理</h3><p>OrcaRouterが処理に合うモデルへルーティング。品質を保ちながらコストと使用モデルを記録。</p><b>最適モデル × 原価の可視化</b></article>
          <article><span>03 · SECURITY</span><h3>機密情報をAIの外へ出さない</h3><p>電話番号や住所などの個人情報を、AIへ送る前に自動マスキング。プロジェクト単位で安全に管理。</p><b>PII保護 × アクセス制御</b></article>
          <article><span>04 · RELIABILITY</span><h3>AIに、最後の決定をさせない</h3><p>見積項目や判断は必ず原文へ戻って確認でき、担当者の承認を経てはじめて施主へ共有。</p><b>根拠表示 × Human in the Loop</b></article>
        </div>
        <div className={styles.productionLine}>
          <span>会話</span><i>→</i><span>個人情報保護</span><i>→</i><span>最適モデル選択</span><i>→</i><span>根拠つき提案</span><i>→</i><span>人が承認</span><i>→</i><span>施主へ共有</span>
        </div>
      </section>

      <section className={styles.finalCta}>
        <Image src="/logo-v.png" alt="KIMARI" width={110} height={110} />
        <p>RENOVATION AI AGENT</p>
        <h2>話すだけで、<br />現場が決まる。</h2>
        <p className={styles.finalLead}>会話が決定に変わる。決定が見積もりに変わる。<br />そして、家づくりのすべてが施主に届く。</p>
        <Link className={styles.finalButton} href="/demo">KIMARIのデモを体験する <span>→</span></Link>
      </section>

      <footer className={styles.footer}>
        <Image src="/logo-h-trim.png" alt="KIMARI" width={150} height={30} />
        <p>AI HACK 2026 / Powered by OrcaRouter</p>
        <small>© 2026 KIMARI</small>
      </footer>
    </main>
  );
}
