const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middlewares/verifyToken');
const initialUsers = require('../fixtures/users.json');

// ⚠️ 寫作業前先 `npm start` 打開 http://localhost:3000/docs 看 Swagger UI 的完整規格。
// 💡 /* 作答區 ... */ 是答題提示區，取消註解後填入你的程式碼。

// ───────────────────────────────────────────────────────────
// state（module 層級、這個 router 獨用）
// ───────────────────────────────────────────────────────────
// 複製 initialUsers，不改外部陣列。
// 預填管理員：{ id: 1, email: 'leo@gym.com', password: <bcrypt hash of '1q2w3e4r'> }
const users = [...initialUsers];
let nextId = initialUsers.length + 1;

const router = express.Router();

// ───────────────────────────────────────────────────────────
// TODO 任務二：POST /register
// ───────────────────────────────────────────────────────────

// POST /register
// - 輸入：body = { email, password }
// - 輸出：201 + { status: 'success', message: '註冊成功' }，或 400 + { status: 'false', message: '...' }
// - 提示：
//   1. email、password 缺少任何一個欄位，或 email 已存在（使用陣列方法檢查）→ return 400 跟對應輸出訊息
//   2. 密碼加密可使用 bcrypt 的 genSalt 與 hash 
//   3. 加密完成後，將新使用者（包含 id、email、加密後 password）存進 users，並 return 201 跟對應輸出訊息
// - 注意：handler 是 async function
// 作答區: router.METHOD('PATH', async (req, res) => { ... });
router.post('/register', async (req, res) => {
    const {email, password} = req.body;
        // 物件解構的寫法：
        // 原物件：body = { email, password }，將物件內各屬性的值取出，
        // 用變數接起後，再以{變數A,變數B...}的方式表示原有物件。
    
    // 第一層：先驗證必要註冊資訊是否齊全
    if(!email || !password){
        return res.status(400).json({ status: 'false', message: '缺少email或password' });
    }
    // 第二層：排除已經註冊過的email
    const existingUser = users.find( user => user.email === email);
    if(existingUser){
        return res.status(400).json({ status: 'false', message: 'email已存在' });
    }

    const salt = await bcrypt.genSalt (10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = {
        id: nextId,  
        // let nextId = initialUsers.length + 1; 僅在auth.js 這個 module 載入時執行一次。只負責：「一開始從幾號開始？」
        // 讀過一次初始化時的會員陣列長度後，後續每有一個新註冊會員，就直接使用nextId++ (每次都+1)。
        // 所以，如果有刪除會員的狀況，因為也不會再去讀取會員陣列的長度，直接都用前一次的註冊時經由nextId++產生的號碼再+1，就不會因為刪除會員讓陣列長度變短而產生重複的id。
        email,  
        // 使用者在一開始輸入的req，解構出來後重新賦予給email這個變數，所以這裡的寫法是「物件屬性縮寫」
        password: hashedPassword
    };
    users.push(newUser);
    nextId++;  // 目前使用者的編號再+1，做為下一位欲註冊的使用者的id。
    return res.status(201).json({ status: 'success', message: '註冊成功' }) ;
});


// ───────────────────────────────────────────────────────────
// TODO 任務三：POST /login
// ───────────────────────────────────────────────────────────

// POST /login
// - 輸入：body = { email, password }
// - 輸出：200 + { status: 'success', token }，或 401 + { status: 'false', message: '帳號或密碼錯誤' }
// - 提示：
//   1. 從 users 找出 email 符合的使用者，如果找不到 → return 401 跟對應輸出訊息
//   2. 用 bcrypt.compare 比對密碼，如果不符合 → return 401 跟對應輸出訊息（兩種失敗回覆同樣訊息，避免帳號探測）(避免讓外部的人藉由錯誤訊息判斷「這個 email 到底存不存在」。)
//   3. 用 jwt.sign 簽出 token，payload 帶入使用者的 id 和 email，secret 使用 process.env.JWT_SECRET，有效期設為 30 天
//   4. token 簽出後，回應 200 跟對應輸出訊息
// - 注意：handler 是 async function
// 作答區：router.METHOD('PATH', async (req, res) => { ... });
router.post('/login', async (req, res) => {
    const {email, password} = req.body;
    const user = users.find( user => user.email === email)
    if (!user){
        return res.status(401).json({ status: 'false', message: '帳號或密碼錯誤' });
    }

    const correct = await bcrypt.compare (password, user.password);
    if (!correct){
        return res.status(401).json({ status: 'false', message: '帳號或密碼錯誤' });
    }

    const token = jwt.sign(
        {id: user.id, email: user.email},   // payload
        process.env.JWT_SECRET,             // secret
        {expiresIn: '30d'}                  // options，通常寫有效期
    );
    return res.status(200).json({ status: 'success', token });
});


// ───────────────────────────────────────────────────────────
// TODO 任務四：GET /me（受保護）
// ───────────────────────────────────────────────────────────

// GET /me
// - 保護：路由第二個參數掛上 verifyToken 守門員（驗過後會將使用者資料掛到 req.user）
// - 輸出：200 + { status: 'success', user: ... }
// 作答區：router.METHOD('PATH', middleware, (req, res) => { ... });
router.get('/me',verifyToken, (req, res) => {
    return res.status(200).json({ status: 'success', user: req.user })
        // verifyToken 中 jwt.verify 驗證成功後，
        // 將 decoded 掛到同一個 req 上成為 req.user，
        // 再呼叫 next() 讓 Express 繼續執行這個 handler，
        // 因此這裡可以從同一個 req 取得 req.user。
});


module.exports = router;
