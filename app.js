// 引入套件
const express = require('express');
const cors = require('cors');  // 處理前端是否可向後端API發request
const swaggerUi = require('swagger-ui-express');

// 引入自己寫的程式碼
const authRouter = require('./routes/auth');
const swaggerDoc = require('./fixtures/swagger.json');

// 呼叫啟用建立真正的Express application;
// 後面的app.use(...)都是在設定這個 app 的功能。
const app = express();  

// ───────────────────────────────────────────────────────────
// TODO 任務五：將 middleware、router、守門員依序掛上 app
// ───────────────────────────────────────────────────────────
// 1. cors()
// 2. express.json()
// 3. Swagger UI /docs（已預先提供如下，同學不需調整）
// 4. /auth router
// 5. 404 守門員（無此路由資訊）
// 6. 錯誤處理守門員（⚠️ 4 個參數、最後一個）
//    回傳 status 500，body 包含兩個欄位：
//    - err：錯誤的類別名稱（例如 'SyntaxError'）
//    - message：錯誤訊息
//
// ⚠️ **最後不需呼叫 app.listen()** — 這個部分交由 server.js 負責（分離「組裝」跟「啟動」，這樣 test.js 可以 supertest 直接戳 app、不佔 port）。


// 沒有指定哪個路由('/XXX')，代表所有request都會經過它。
app.use(cors());  
// 負責解析 Content-Type: application/json的 request帶進來的 body。
app.use(express.json());   

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// '/register'、'/login'、'/me' 都要等auth.js掛載到 app 上後才能真正使用。
app.use('/auth', authRouter);

// 沒有指定哪個路由('/XXX')，代表所有不符合上述路由的request都會被這裡接收。
app.use((req,res) => {
    return res.status(404).json({message: "無此路由資訊"});
});

// 四個參數的形式是專門處理error
app.use((err,req,res,next) => {
    return res.status(500).json({
        err:err.name,
        message:err.message
    });
});

module.exports = app;
