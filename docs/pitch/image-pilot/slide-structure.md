# Slide Structure

Status: locked
Revision: pilot-story-r1
Approval evidence: User said「これ、お願いします」after the proposal to preserve the HTML deck and create slide 01 and slide 05 pilots.
Purpose: Test a photo-led image-only visual system without changing the approved final-pitch story.
Audience: AI HACK 2026 judges
Source of truth: ../brief.md
Research file: research-brief.md
Research mode: provided-only
Content depth profile: evidence-rich
Depth profile approval: Existing four-minute brief is user-approved; cover uses cover exception and slide 05 retains all approved evidence.
Design intake file: design-intake.json
Slide count: 2 pilot pages representing original slides 01 and 05
Story arc: Open with the product promise, then test the densest differentiating evidence page.

## 01｜OPENING｜cover

- Objective: The audience must immediately understand the product name, promise, and maker credibility.
- Proposed title: 話すだけで、現場が決まる。
- Context: Opening page of a four-minute final pitch.
- Key claim: KIMARIは、打ち合わせの会話から追加見積が必要な変更だけを見つけるAIエージェントである。
- Claim type: factual
- Content points: []
- Evidence: []
- Implication: The audience knows what will be demonstrated next.
- Caveat: none
- Must keep: []
- Proposed visible text: ["KIMARI", "話すだけで、現場が決まる。", "打ち合わせの会話から、追加見積が必要な変更だけを見つける", "AI HACK 2026", "Mari（金子麻里）", "建築設計・施工管理 20年"]
- Semantic text indices: [2, 3]
- Source IDs: []
- Citation text: []
- Depth class: cover
- Depth exception: cover
- Depth exception evidence: Approved opening page in ../brief.md
- Layout family: cover
- Layout variant: cover-photo-led-sparse
- Diagram type: none
- Diagram intent: none
- Composition constraints: Product promise must read first; architecture photography supports but does not obscure copy.
- Density risk: low

## 05｜EVIDENCE｜comparison

- Objective: Prove that KIMARI reasons from the project phase and contract rather than returning generic construction tasks.
- Proposed title: 同じ発言でも、工程で出力が変わります。
- Context: After the demo, judges need evidence of domain-specific technical depth.
- Key claim: KIMARIは、同じ発言でも契約前と解体確認後で追加見積候補を33項目から3項目へ変える。
- Claim type: factual
- Content points: ["見積提出（契約前）は33項目・51秒", "解体確認（契約後）は3項目・32秒", "当初見積書から読んだ契約64項目と突き合わせる"]
- Evidence: ["同じ入力で33項目から3項目へ変化した [S01]", "当初見積書64項目を判定根拠に使う [S02]"]
- Implication: This is not generic meeting summarization; it is renovation-specific decision support.
- Caveat: Test data result; field deployment is not claimed.
- Must keep: ["33項目", "51秒", "3項目", "32秒", "契約64項目", "外した項目も理由つきで返す"]
- Proposed visible text: ["ここが、実務者にしか作れなかった部分です", "同じ発言でも、工程で出力が変わります。", "見積提出（契約前）", "33項目", "51秒", "解体確認（契約後）", "3項目", "32秒", "当初見積書（Excel）から読んだ契約64項目と突き合わせる", "その変更がなければ発生しなかった分だけを出す", "外した項目も理由つきで返す", "推測ではなく、その現場の契約書で判定する"]
- Semantic text indices: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
- Source IDs: ["S01", "S02"]
- Citation text: []
- Depth class: comparison
- Depth exception: user-approved
- Depth exception evidence: Four-minute stage deck deliberately limits visible copy; exact approved content retained.
- Layout family: comparison
- Layout variant: comparison-before-after-photo-evidence
- Diagram type: before-after
- Diagram intent: Compare the same utterance before contract and after demolition confirmation, showing a reduction from 16 to 3 candidate items.
- Composition constraints: Both phases share one axis; 16 and 3 are dominant; contract 64 is the causal basis; excluded items remain visibly acknowledged.
- Density risk: high because all approved numbers and causal explanation must remain legible.
