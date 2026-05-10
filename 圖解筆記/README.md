# 視覺化圖解筆記 (Visual Notes)

這裡將《Golang 學習筆記》中的核心觀念轉化為視覺化的流程圖、架構圖與序列圖。
人類大腦處理圖像的速度遠快於文字，強烈建議在理解複雜概念（如 GMP 模型、Slice 底層、Middleware 執行順序）時，搭配這些圖解進行學習。

## 圖解目錄

1. 🧠 **[架構與記憶體 (Memory & Architecture)](01-架構與記憶體.md)**
   - Stack vs Heap、指標傳遞 vs 值傳遞、逃逸分析
2. 📦 **[資料結構視覺化 (Data Structures)](02-資料結構視覺化.md)**
   - Slice 的三欄位結構、Append 的底層行為、字串與位元組
3. 🧱 **[物件導向抽象 (OOP in Go)](03-物件導向抽象.md)**
   - 結構體組合 (Embedding)、Interface 依賴反轉、Method Set
4. 🚦 **[併發模型 GMP (Concurrency)](04-併發模型GMP.md)**
   - M:N 排程器、Goroutine 狀態、Channel Fan-in/Fan-out、Context 樹狀結構
5. 🌐 **[後端實務 (Backend Patterns)](05-後端實務.md)**
   - Middleware 洋蔥模型、Graceful Shutdown 流程、連線池生命週期

## 匯出格式

除了直接在此預覽 Markdown 以外，我們也為您準備了兩種常見的匯出格式，方便您離線閱讀或列印：

- 🌐 **[網頁檔案 (HTML 版)](網頁檔案/)**：可以直接在任何瀏覽器中點開，圖表會動態渲染，適合放在手機或平板上複習。
- 📄 **[PDF 檔案 (列印版)](PDF檔案/)**：已經將 Mermaid 圖表固定為高解析度向量圖的 A4 排版，適合列印成紙本筆記。

> **閱讀建議**：您可以直接在 GitHub 或支援 Mermaid 的 Markdown 編輯器（如 Notion, Obsidian）中預覽，或者打開 `網頁檔案/` 中的 HTML 來獲得最佳的排版體驗。
