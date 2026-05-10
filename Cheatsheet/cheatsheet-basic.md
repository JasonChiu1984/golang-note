# Go 基礎 Cheat Sheet

> 一頁速查，適合剛學 Go 或日常快速回憶用。

---

## 變數與型別

```go
var name string            // 明確型別
var age = 25               // 型別推斷
count := 3                 // 短宣告（函式內）
x, y := 1, 2              // 多變數
const MaxRetry = 3         // 常數
```

| 型別 | 零值 | 範例 |
|---|---|---|
| `int`, `float64` | `0` | `var n int` |
| `bool` | `false` | `var ok bool` |
| `string` | `""` | `var s string` |
| pointer, slice, map, channel, interface | `nil` | `var p *int` |

---

## 流程控制

```go
// if（可帶短變數）
if v, ok := m["key"]; ok {
    fmt.Println(v)
}

// switch（不需要 break）
switch status {
case "new":    create()
case "done":   archive()
default:       ignore()
}

// for（Go 唯一的迴圈）
for i := 0; i < 10; i++ { }  // 傳統
for condition { }              // while
for { break }                  // 無限
for i, v := range slice { }   // 遍歷
```

---

## 函式與錯誤

```go
// 多回傳值
func divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("divide by zero")
    }
    return a / b, nil
}

// 呼叫端
result, err := divide(10, 3)
if err != nil {
    return fmt.Errorf("calc: %w", err)  // 包裝錯誤
}
```

| 錯誤 API | 用途 |
|---|---|
| `errors.New("msg")` | 建立錯誤 |
| `fmt.Errorf("%w", err)` | 包裝錯誤 |
| `errors.Is(err, target)` | 判斷錯誤鏈 |
| `errors.As(err, &target)` | 取出型別 |

---

## Struct 與 Method

```go
type User struct {
    ID   int
    Name string
}

// Value receiver（不可修改）
func (u User) Display() string {
    return fmt.Sprintf("%d:%s", u.ID, u.Name)
}

// Pointer receiver（可修改）
func (u *User) Rename(name string) {
    u.Name = name
}
```

---

## Slice

```go
s := []int{1, 2, 3}
s = append(s, 4, 5)          // 新增
s2 := make([]int, 0, 10)     // 預分配容量
copy(dst, src)                // 複製
s[1:3]                        // 切片 [2, 3]
len(s)                        // 長度
cap(s)                        // 容量
```

---

## Map

```go
m := map[string]int{"a": 1, "b": 2}
m["c"] = 3                   // 新增/更新
v, ok := m["a"]              // 讀取 + 存在檢查
delete(m, "b")               // 刪除
for k, v := range m { }     // 遍歷
```

> ⚠️ map 不是 thread-safe，併發讀寫需加 `sync.Mutex`。

---

## Goroutine 與 Channel

```go
// 啟動 goroutine
go func() {
    fmt.Println("background")
}()

// Channel
ch := make(chan int)          // unbuffered
ch := make(chan int, 10)      // buffered

ch <- 42                      // 傳送
v := <-ch                    // 接收
close(ch)                     // 關閉（由 sender）

// range 讀取直到關閉
for v := range ch {
    process(v)
}

// select 多路複用
select {
case v := <-ch:      handle(v)
case <-ctx.Done():   return
case <-time.After(3*time.Second): timeout()
}
```

---

## 同步工具

```go
var wg sync.WaitGroup
wg.Add(1)
go func() {
    defer wg.Done()
    work()
}()
wg.Wait()

var mu sync.Mutex
mu.Lock()
defer mu.Unlock()
// 操作共享資料
```

---

## 常用標準庫

```go
// JSON
data, _ := json.Marshal(user)
json.Unmarshal(data, &user)

// HTTP Client
resp, _ := http.Get("https://example.com")
defer resp.Body.Close()

// 檔案
data, _ := os.ReadFile("file.txt")
os.WriteFile("out.txt", data, 0644)

// 字串
strings.Contains(s, "go")
strings.Split(s, ",")
strings.Join(parts, "-")
fmt.Sprintf("name=%s age=%d", name, age)

// 時間
time.Now()
time.Sleep(time.Second)
time.After(3 * time.Second)
```

---

## 工具鏈指令

| 指令 | 用途 |
|---|---|
| `go run .` | 編譯並執行 |
| `go build -o bin/app .` | 編譯出執行檔 |
| `go test ./...` | 執行所有測試 |
| `go test -race ./...` | 啟用 race detector |
| `go test -bench=. ./...` | 執行 benchmark |
| `go mod init module` | 初始化 module |
| `go mod tidy` | 清理依賴 |
| `go fmt ./...` | 格式化程式碼 |
| `go vet ./...` | 靜態分析 |
| `go doc fmt.Println` | 查看文件 |

---

## defer

```go
file, err := os.Open("data.txt")
if err != nil { return err }
defer file.Close()  // 函式結束時執行
```

> 多個 defer 按 LIFO（後進先出）順序執行。

---

## 標識符命名規則

```go
myVar       // ✓ 小寫開頭 = 私有
MyFunc      // ✓ 大寫開頭 = 公開 (exported)
_temp       // ✓ 底線開頭合法
user_id     // ✓ 可用底線
2ndItem     // ✗ 不能以數字開頭
my-var      // ✗ 不能用連字號
```

---

## 25 個關鍵字

```text
break     default      func    interface  select
case      defer        go      map        struct
chan      else         goto    package    switch
const     fallthrough  if      range      type
continue  for          import  return     var
```

---

## 數字字面量

```go
42             // 十進位
0o755          // 八進位
0xFF           // 十六進位
0b1010         // 二進位
1_000_000      // 底線分隔（可讀性）
3.14           // 浮點數
1.5e10         // 科學記號
'A'            // rune (int32)
"hello"        // interpreted 字串
`raw\nstring`  // raw 字串（不解釋跳脫）
```

---

## 預宣告函式速查

| 函式 | 用途 | 範例 |
|---|---|---|
| `len` | 長度 | `len(s)` `len(m)` |
| `cap` | 容量 | `cap(s)` |
| `make` | 建立 slice/map/channel | `make([]int, 10)` |
| `new` | 配置零值指標 | `new(int)` |
| `append` | 追加到 slice | `append(s, 1)` |
| `copy` | 複製 slice | `copy(dst, src)` |
| `delete` | 刪除 map key | `delete(m, "k")` |
| `close` | 關閉 channel | `close(ch)` |
| `panic` | 觸發 panic | `panic("err")` |
| `recover` | 捕獲 panic | `recover()` |
| `clear` | 清除 map/slice | `clear(m)` |
| `min` / `max` | 最小/最大值 | `min(1,2,3)` |

---

## `time` 套件速查

```go
// 取得時間
now := time.Now()                    // 當前時間（含時區）
t := time.Date(2024, 1, 15, 10, 0, 0, 0, time.UTC)

// 計算
elapsed := time.Since(start)         // 從 start 到現在的 Duration
remaining := time.Until(deadline)    // 距離 deadline 的 Duration
d := 3*time.Hour + 30*time.Minute    // Duration 運算

// 格式化（Go 使用 reference time: 2006-01-02 15:04:05）
s := now.Format("2006-01-02")             // "2024-01-15"
s = now.Format("2006-01-02 15:04:05")     // "2024-01-15 10:00:00"
s = now.Format(time.RFC3339)              // "2024-01-15T10:00:00Z"

// 解析
t, err = time.Parse("2006-01-02", "2024-01-15")
t, err = time.ParseInLocation("2006-01-02 15:04:05", s, time.Local)

// 時區
loc, _ := time.LoadLocation("Asia/Taipei")
taipeiTime := now.In(loc)
```

> ⚠️ **Reference Time 是 Go 的特殊設計**：格式字串必須使用 `2006-01-02 15:04:05`（代表 Mon Jan 2 15:04:05 MST 2006），而不是 `YYYY-MM-DD`。這是最常踩的 Go 陷阱之一。

| Duration 常數 | 值 |
|---|---|
| `time.Nanosecond` | 1 |
| `time.Microsecond` | 1000 |
| `time.Millisecond` | 1_000_000 |
| `time.Second` | 1_000_000_000 |
| `time.Minute` | 60s |
| `time.Hour` | 3600s |

---

## `fmt` 格式化動詞速查

```go
// 通用
fmt.Sprintf("%v", value)    // 預設格式（最常用）
fmt.Sprintf("%+v", struct{}) // struct 含欄位名
fmt.Sprintf("%#v", value)   // Go 語法表示
fmt.Sprintf("%T", value)    // 型別名稱

// 整數
fmt.Sprintf("%d", 42)       // 十進位：42
fmt.Sprintf("%b", 42)       // 二進位：101010
fmt.Sprintf("%o", 42)       // 八進位：52
fmt.Sprintf("%x", 42)       // 十六進位小寫：2a
fmt.Sprintf("%X", 255)      // 十六進位大寫：FF
fmt.Sprintf("%05d", 42)     // 補零：00042

// 字串
fmt.Sprintf("%s", "hello")  // hello
fmt.Sprintf("%q", "hello")  // "hello"（含引號，可用於 debug）
fmt.Sprintf("%-10s|", "hi") // "hi        |"（左對齊）

// 浮點數
fmt.Sprintf("%f", 3.14)     // 3.140000
fmt.Sprintf("%.2f", 3.14)   // 3.14
fmt.Sprintf("%e", 3.14)     // 3.140000e+00
fmt.Sprintf("%g", 3.14)     // 3.14（最短表示）

// 指標與 error
fmt.Sprintf("%p", &x)       // 記憶體位址：0xc000...
fmt.Sprintf("%w", err)      // error wrapping（僅用於 fmt.Errorf）
```


